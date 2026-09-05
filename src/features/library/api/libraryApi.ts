/**
 * libraryApi.ts — Client de la Bibliothèque Juridique (backend Laravel).
 *
 * Deux couches strictement découplées :
 *  - **Recherche** : moteur 100 % PostgreSQL (full-text), filtres serveur,
 *    pagination réelle. Aucune IA, aucune synthèse — uniquement des résultats.
 *  - **IA à la demande** : explication d'un article ou synthèse d'une recherche,
 *    en streaming SSE, déclenchées explicitement par l'utilisateur.
 *
 * Fournit aussi les URLs d'actions documentaires (PDF, JSON).
 */

import { laravelClient, laravelBaseUrl, openSsePost, SSE_DONE } from '@/shared/api';
import type {
  DocumentTypeOption,
  InstitutionOption,
  LegalScope,
  LibraryAiCallbacks,
  LibraryFilterState,
  LibraryHomeData,
  LibrarySearchResult,
  LibrarySuggestions,
  SearchResultItem,
  SearchSort,
} from '@/features/library/types';

export interface SearchParams {
  q: string;
  /** Code du type de document (filtre serveur). */
  type?: string | null;
  /** Périmètre juridique (national/ohada/communautaire ; 'all' = pas de filtre). */
  legalScope?: LegalScope;
  /** UUID de l'institution émettrice. */
  institutionId?: string | null;
  /** Bornes de date de publication (YYYY-MM-DD). */
  dateFrom?: string | null;
  dateTo?: string | null;
  /** Tri des résultats. */
  sort?: SearchSort;
  /** Slug du thème de vie (filtre serveur `tag`). */
  tag?: string | null;
  /** Restreindre à un document précis. */
  documentId?: string | null;
  page?: number;
  perPage?: number;
}

/**
 * Recherche dans la base juridique (moteur hybride : full-text PostgreSQL +
 * filets de rappel trigram et sémantique).
 *
 * Renvoie toujours une liste paginée d'articles classés par pertinence —
 * jamais de réponse générée par l'IA (la synthèse est une action distincte).
 */
export async function searchLibrary(
  params: SearchParams,
): Promise<LibrarySearchResult> {
  const res = await laravelClient.get<{
    success: boolean;
    message?: string;
    data: SearchResultItem[];
    pagination?: LibrarySearchResult['pagination'];
  }>('library/search', {
    params: {
      q: params.q,
      type: params.type || undefined,
      // 'all' signifie « tous périmètres » → on n'envoie pas le filtre.
      legal_scope:
        params.legalScope && params.legalScope !== 'all'
          ? params.legalScope
          : undefined,
      institution_id: params.institutionId || undefined,
      date_from: params.dateFrom || undefined,
      date_to: params.dateTo || undefined,
      sort: params.sort && params.sort !== 'relevance' ? params.sort : undefined,
      tag: params.tag || undefined,
      document_id: params.documentId || undefined,
      page: params.page || undefined,
      per_page: params.perPage || undefined,
    },
  });

  return {
    results: Array.isArray(res.data?.data) ? res.data.data : [],
    pagination: res.data?.pagination ?? null,
  };
}

/**
 * Autocomplétion temps réel de la barre de recherche : titres de textes,
 * articles par numéro et passages du contenu correspondant à la frappe.
 */
export async function getLibrarySuggestions(
  q: string,
): Promise<LibrarySuggestions> {
  const res = await laravelClient.get<{ data: LibrarySuggestions }>(
    'library/suggest',
    { params: { q } },
  );
  return (
    res.data?.data ?? { documents: [], articles: [], passages: [] }
  );
}

/**
 * Accueil de la Bibliothèque : textes fondamentaux, derniers textes publiés,
 * statistiques du fonds documentaire et suggestions de recherche.
 */
export async function getLibraryHome(): Promise<LibraryHomeData> {
  const res = await laravelClient.get<{ data: LibraryHomeData }>('library/home');
  return res.data.data;
}

/** Liste des types de documents (filtre latéral). */
export async function getDocumentTypes(): Promise<DocumentTypeOption[]> {
  const res = await laravelClient.get<{ data: DocumentTypeOption[] }>(
    'document-types',
  );
  return res.data?.data ?? [];
}

/** Liste des institutions émettrices (filtre latéral). */
export async function getInstitutions(): Promise<InstitutionOption[]> {
  const res = await laravelClient.get<{ data: InstitutionOption[] }>(
    'institutions',
    { params: { sort: 'nom' } },
  );
  return res.data?.data ?? [];
}

// ---------------------------------------------------------------------------
// IA à la demande — streaming SSE (explication d'article / synthèse)
// ---------------------------------------------------------------------------

/**
 * Consomme un flux SSE POST et branche chaque évènement sur les callbacks.
 *
 * Mêmes événements que l'Assistant (`status`/`sources`/`error`/`message`), à ceci
 * près qu'il n'y a ni en-tête `X-Conversation-Id` ni événement `meta`. Le
 * transport (`fetch` + `ReadableStream`, en-têtes, gestion des erreurs HTTP) est
 * mutualisé dans `shared/api` via {@link openSsePost}.
 */
function consumeSse(
  path: string,
  body: Record<string, unknown>,
  callbacks: LibraryAiCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let done = false;

  return openSsePost({
    url: `${laravelBaseUrl}/${path}`,
    body,
    signal,
    onFrame: ({ event, data }) => {
      if (data === SSE_DONE) {
        callbacks.onDone?.();
        done = true;
        return true; // arrête la lecture
      }

      try {
        switch (event) {
          case 'status': {
            callbacks.onStatus?.(JSON.parse(data).message ?? '');
            break;
          }
          case 'sources': {
            const sources = JSON.parse(data);
            if (Array.isArray(sources)) callbacks.onSources?.(sources);
            break;
          }
          case 'error': {
            callbacks.onError?.(JSON.parse(data).message ?? 'Erreur inconnue');
            break;
          }
          // Évènement par défaut "message" => fragment de texte.
          default: {
            const payload = JSON.parse(data);
            if (payload.type === 'text_delta' && typeof payload.delta === 'string') {
              callbacks.onDelta?.(payload.delta);
            }
          }
        }
      } catch {
        // Trame JSON malformée — on l'ignore pour ne pas casser le flux.
      }
    },
  }).then(() => {
    // Fin de flux sans sentinelle `[DONE]` explicite.
    if (!done) callbacks.onDone?.();
  });
}

/** Streame l'explication pédagogique d'un article précis. */
export function streamLibraryExplain(
  { articleId, signal }: { articleId: string; signal?: AbortSignal },
  callbacks: LibraryAiCallbacks,
): Promise<void> {
  return consumeSse('library/explain', { article_id: articleId }, callbacks, signal);
}

/** Streame la synthèse Mibeko IA du top-K d'une recherche (mêmes filtres serveur). */
export function streamLibrarySynthesis(
  {
    q,
    filters,
    signal,
  }: { q: string; filters: LibraryFilterState; signal?: AbortSignal },
  callbacks: LibraryAiCallbacks,
): Promise<void> {
  return consumeSse(
    'library/synthesis',
    {
      q,
      type: filters.typeCode || undefined,
      legal_scope: filters.legalScope !== 'all' ? filters.legalScope : undefined,
      institution_id: filters.institutionId || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
    },
    callbacks,
    signal,
  );
}

// ---------------------------------------------------------------------------
// URLs d'actions documentaires (endpoints publics Laravel)
// ---------------------------------------------------------------------------

/** URL du PDF source original. */
export const sourcePdfUrl = (id: string): string =>
  `${laravelBaseUrl}/legal-documents/${id}/pdf`;

/** URL du PDF original du journal officiel dans lequel un texte est paru. */
export const journalPdfUrl = (journalId: string): string =>
  `${laravelBaseUrl}/legal-documents/${journalId}/pdf?type=journal`;

/**
 * Mint une URL signée à courte durée de vie pour le PDF Mibeko (consolidé /
 * enrichi) d'un document — mibeko-dashboard#86 : la route est réservée à
 * l'entitlement Pro, et le clic direct `<a href>` du lecteur ne porte aucun
 * jeton Bearer. Lève (403) si le compte n'a pas l'entitlement `export`.
 */
export async function mintMibekoExportUrl(id: string): Promise<string> {
  const res = await laravelClient.get<{ data: { url: string } }>(
    `legal-documents/${id}/export-token`,
  );
  return res.data.data.url;
}

/** URL de l'export JSON de synchronisation. */
export const jsonExportUrl = (id: string): string =>
  `${laravelBaseUrl}/legal-documents/${id}/download`;

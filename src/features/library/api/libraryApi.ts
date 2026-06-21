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

import { laravelClient, laravelBaseUrl } from '@/shared/api';
import { getStoredToken } from '@/features/auth/store/authStore';
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

/** Découpe une trame SSE brute en `{ event, data }` (même format que l'Assistant). */
function parseSseFrame(frame: string): { event: string; data: string } | null {
  const lines = frame.split('\n');
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }

  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

/**
 * Consomme un flux SSE POST et branche chaque évènement sur les callbacks.
 *
 * `EventSource` ne gérant pas les requêtes POST avec corps, on lit le flux via
 * `fetch` + `ReadableStream` (comme la feature Assistant).
 */
async function consumeSse(
  path: string,
  body: Record<string, unknown>,
  callbacks: LibraryAiCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const token = getStoredToken();

  const response = await fetch(`${laravelBaseUrl}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    let detail = `Erreur ${response.status}`;
    try {
      const payload = await response.json();
      detail = payload?.message || detail;
    } catch {
      /* corps non JSON — on garde le code HTTP */
    }
    throw new Error(detail);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const rawFrame of frames) {
      if (!rawFrame.trim()) continue;
      const parsed = parseSseFrame(rawFrame);
      if (!parsed) continue;

      const { event, data } = parsed;

      if (data === '[DONE]') {
        callbacks.onDone?.();
        return;
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
    }
  }

  callbacks.onDone?.();
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

/** URL du PDF Mibeko (consolidé / enrichi). */
export const mibekoPdfUrl = (id: string): string =>
  `${laravelBaseUrl}/legal-documents/${id}/export`;

/** URL de l'export JSON de synchronisation. */
export const jsonExportUrl = (id: string): string =>
  `${laravelBaseUrl}/legal-documents/${id}/download`;

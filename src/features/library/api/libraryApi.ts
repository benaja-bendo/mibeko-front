/**
 * libraryApi.ts — Client de la Bibliothèque Juridique (backend Laravel).
 *
 * Recherche hybride (vectorielle + plein-texte) avec filtres serveur robustes
 * (type, institution, périmètre, dates, tri), pagination réelle et réponse RAG
 * optionnelle. Fournit aussi les URLs d'actions documentaires (PDF, JSON).
 */

import { laravelClient, laravelBaseUrl } from '@/shared/api';
import type {
  DocumentTypeOption,
  InstitutionOption,
  LegalScope,
  LibrarySearchResult,
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
  /** Restreindre à un document précis. */
  documentId?: string | null;
  /** Demander une réponse de synthèse (RAG / mode sémantique). */
  rag?: boolean;
  page?: number;
  perPage?: number;
}

/**
 * Recherche dans la base juridique.
 *
 * Normalise les deux formes de réponse du backend :
 *  - RAG    : `data: { answer, sources: [...], pagination }`
 *  - simple : `data: [...items], pagination`
 */
export async function searchLibrary(
  params: SearchParams,
): Promise<LibrarySearchResult> {
  const res = await laravelClient.get<{
    success: boolean;
    message?: string;
    data:
      | SearchResultItem[]
      | {
          answer?: string;
          sources?: SearchResultItem[];
          pagination?: LibrarySearchResult['pagination'];
        };
    pagination?: LibrarySearchResult['pagination'];
  }>('search', {
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
      document_id: params.documentId || undefined,
      rag: params.rag ? 1 : undefined,
      page: params.page || undefined,
      per_page: params.perPage || undefined,
    },
  });

  const body = res.data;

  if (body.data && !Array.isArray(body.data)) {
    return {
      answer: body.data.answer ?? null,
      results: body.data.sources ?? [],
      pagination: body.data.pagination ?? null,
    };
  }

  return {
    answer: null,
    results: Array.isArray(body.data) ? body.data : [],
    pagination: body.pagination ?? null,
  };
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
// URLs d'actions documentaires (endpoints publics Laravel)
// ---------------------------------------------------------------------------

/** URL du PDF source original. */
export const sourcePdfUrl = (id: string): string =>
  `${laravelBaseUrl}/legal-documents/${id}/pdf`;

/** URL du PDF Mibeko (consolidé / enrichi). */
export const mibekoPdfUrl = (id: string): string =>
  `${laravelBaseUrl}/legal-documents/${id}/export`;

/** URL de l'export JSON de synchronisation. */
export const jsonExportUrl = (id: string): string =>
  `${laravelBaseUrl}/legal-documents/${id}/download`;

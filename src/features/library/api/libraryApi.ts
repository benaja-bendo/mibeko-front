/**
 * libraryApi.ts — Client de la Bibliothèque Juridique (backend Laravel).
 *
 * Recherche hybride (vectorielle + plein-texte) avec réponse RAG optionnelle,
 * et récupération des types de documents pour les filtres.
 */

import { laravelClient } from '@/shared/api';
import type {
  DocumentTypeOption,
  LibrarySearchResult,
  SearchResultItem,
} from '@/features/library/types';

export interface SearchParams {
  q: string;
  /** Code du type de document (filtre serveur). */
  type?: string | null;
  /** Restreindre à un document précis. */
  documentId?: string | null;
  /** Demander une réponse de synthèse (RAG). */
  rag?: boolean;
  page?: number;
  perPage?: number;
}

/**
 * Recherche dans la base juridique.
 *
 * Le backend renvoie deux formes selon qu'une réponse RAG est générée :
 *  - RAG    : `data: { answer, sources: [...], pagination }`
 *  - simple : `data: [...items], pagination`
 * On normalise les deux vers `LibrarySearchResult`.
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
      document_id: params.documentId || undefined,
      rag: params.rag ? 1 : undefined,
      page: params.page || undefined,
      per_page: params.perPage || undefined,
    },
  });

  const body = res.data;

  // Forme RAG : data est un objet { answer, sources, pagination }.
  if (body.data && !Array.isArray(body.data)) {
    return {
      answer: body.data.answer ?? null,
      results: body.data.sources ?? [],
      pagination: body.data.pagination ?? null,
    };
  }

  // Forme simple : data est un tableau de résultats.
  return {
    answer: null,
    results: Array.isArray(body.data) ? body.data : [],
    pagination: body.pagination ?? null,
  };
}

/** Liste des types de documents (pour le filtre latéral). */
export async function getDocumentTypes(): Promise<DocumentTypeOption[]> {
  const res = await laravelClient.get<{ data: DocumentTypeOption[] }>(
    'document-types',
  );
  return res.data?.data ?? [];
}

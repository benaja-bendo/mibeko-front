/**
 * useLibrary.ts — Hooks TanStack Query pour la Bibliothèque Juridique.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getDocumentTypes,
  searchLibrary,
  type SearchParams,
} from '@/features/library/api/libraryApi';

export const libraryKeys = {
  all: ['library'] as const,
  search: (params: SearchParams) => [...libraryKeys.all, 'search', params] as const,
  types: () => [...libraryKeys.all, 'document-types'] as const,
};

/**
 * Recherche juridique. Désactivée tant que la requête fait moins de 2 caractères.
 * Conserve les résultats précédents pendant le rechargement (pas de clignotement).
 */
export function useLibrarySearch(params: SearchParams) {
  const enabled = params.q.trim().length >= 2;
  return useQuery({
    queryKey: libraryKeys.search(params),
    queryFn: () => searchLibrary(params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/** Types de documents pour les filtres (mis en cache longuement). */
export function useDocumentTypes() {
  return useQuery({
    queryKey: libraryKeys.types(),
    queryFn: getDocumentTypes,
    staleTime: 10 * 60_000,
  });
}

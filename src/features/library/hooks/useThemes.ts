import { useMutation, useQuery } from '@tanstack/react-query';
import { listThemes, getThemeDocuments, suggestDocumentThemes } from '@/features/library/api/themesApi';

/** Liste des thèmes de vie (avec compteurs de textes publiés). */
export function useThemes() {
  return useQuery({
    queryKey: ['library', 'themes'],
    queryFn: listThemes,
    staleTime: 5 * 60 * 1000,
  });
}

/** Textes publiés d'un thème (vue « Parcourir par thème »). */
export function useThemeDocuments(slug: string | null) {
  return useQuery({
    queryKey: ['library', 'theme-documents', slug],
    queryFn: () => getThemeDocuments(slug as string),
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
}

/** Suggestion IA de thèmes pour un document (assistance éditeur). */
export function useSuggestThemes() {
  return useMutation({
    mutationFn: (documentId: string) => suggestDocumentThemes(documentId),
  });
}

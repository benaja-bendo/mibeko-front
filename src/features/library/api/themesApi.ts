import { apiFetch } from '@/features/documents/api/laravelApi';
import type { DocumentTheme } from '@/shared/types/database';
import type { LibraryHomeDocument } from '@/features/library/types';

/**
 * themesApi.ts — Thèmes de vie (taxonomie réutilisée des « tags »).
 *
 * `GET library/themes` alimente la bande « Parcourir par thème » ; la
 * suggestion IA assiste l'éditeur lors de la curation d'un document.
 */

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Theme {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  documents_count: number;
}

export const listThemes = (): Promise<Theme[]> =>
  apiFetch<Envelope<Theme[]>>('/library/themes').then((r) => r.data);

export interface ThemeDocumentsResult {
  theme: { id: string; name: string; slug: string; icon: string | null; description: string | null };
  documents: LibraryHomeDocument[];
}

/** Textes publiés rattachés à un thème (parcours, pas recherche full-text). */
export const getThemeDocuments = (slug: string): Promise<ThemeDocumentsResult> =>
  apiFetch<Envelope<ThemeDocumentsResult>>(`/library/themes/${encodeURIComponent(slug)}`).then((r) => r.data);

/** Suggestion IA de thèmes pour un document (assistance éditeur, non écrite). */
export const suggestDocumentThemes = (documentId: string): Promise<DocumentTheme[]> =>
  apiFetch<Envelope<DocumentTheme[]>>(`/legal-documents/${documentId}/suggest-themes`, {
    method: 'POST',
  }).then((r) => r.data);

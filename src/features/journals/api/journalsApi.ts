import { apiFetch, type LaravelDocument } from '@/features/documents/api/laravelApi';
import { laravelBaseUrl as BASE } from '@/shared/api';

/**
 * journalsApi.ts — Administration des journaux officiels (espace éditeur).
 *
 * La lecture passe par les endpoints publics /official-journals avec
 * `include_unpublished=1` (réservé aux rôles editor/admin côté backend) ;
 * l'écriture par les routes PATCH/DELETE guardées.
 */

export interface OfficialJournal {
  id: string;
  title: string;
  number?: string | null;
  publication_date?: string | null;
  transcription_status?: 'pending' | 'in_progress' | 'completed' | 'failed' | string | null;
  is_published: boolean;
  pdf_url?: string | null;
  file_size_bytes?: number | null;
  legal_documents_count?: number;
  published_legal_documents_count?: number;
  legal_documents?: LaravelDocument[];
  created_at?: string;
  updated_at?: string;
}

export interface JournalFilters {
  page?: number;
  per_page?: number;
  title?: string;
  year?: string;
  transcription_status?: string;
  is_published?: '' | 'true' | 'false';
  sort?: string;
  /**
   * Vue manager (espace éditeur) : inclut les journaux non publiés et le
   * double compteur publiés/total. À laisser false côté Pro pour que même un
   * éditeur navigant en « vue utilisateur » ne voie que le fonds publié.
   */
  managerView?: boolean;
}

export interface JournalListResponse {
  data: OfficialJournal[];
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
}

export const listJournals = (filters: JournalFilters = {}): Promise<JournalListResponse> => {
  const q = new URLSearchParams();
  if (filters.managerView) q.set('include_unpublished', '1');
  q.set('per_page', String(filters.per_page ?? 20));
  q.set('sort', filters.sort ?? '-publication_date');
  if (filters.page) q.set('page', String(filters.page));
  if (filters.title) q.set('filter[title]', filters.title);
  if (filters.year) q.set('filter[year]', filters.year);
  if (filters.transcription_status) q.set('filter[transcription_status]', filters.transcription_status);
  if (filters.is_published) q.set('filter[is_published]', filters.is_published);
  return apiFetch<JournalListResponse>(`/official-journals?${q.toString()}`);
};

/** Détail d'un journal (ressource non enveloppée : withoutWrapping actif côté API). */
export const getJournal = (id: string, opts: { managerView?: boolean } = {}): Promise<OfficialJournal> =>
  apiFetch<OfficialJournal>(`/official-journals/${id}${opts.managerView ? '?include_unpublished=1' : ''}`);

/** Années de publication des journaux publiés (chips du kiosque Pro). */
export const listJournalYears = (): Promise<{ data: Array<{ year: number; total: number }> }> =>
  apiFetch<{ data: Array<{ year: number; total: number }> }>(`/official-journals/years`);

export const updateJournal = (
  id: string,
  payload: Partial<{
    title: string;
    number: string | null;
    publication_date: string | null;
    is_published: boolean;
  }>
) =>
  apiFetch<{ data: OfficialJournal; message?: string }>(`/official-journals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deleteJournal = (id: string) =>
  apiFetch<{ message?: string }>(`/official-journals/${id}`, { method: 'DELETE' });

/**
 * Crée manuellement un texte manquant (acte de FLUX), généralement rattaché
 * au journal dont l'extraction l'a oublié. La structuration (articles,
 * nœuds) se fait ensuite dans le viewer.
 */
export const createMissingDocument = (payload: {
  titre_officiel: string;
  official_journal_id?: string | null;
  type_code?: string | null;
  reference_nor?: string | null;
  date_signature?: string | null;
  date_publication?: string | null;
  statut?: 'vigueur' | 'abroge' | 'projet';
}) =>
  apiFetch<{ data: LaravelDocument }>(`/legal-documents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/** Rattache (journalId) ou détache (null) un texte existant. */
export const setDocumentJournal = (documentId: string, journalId: string | null) =>
  apiFetch<{ data: LaravelDocument }>(`/legal-documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ official_journal_id: journalId }),
  });

/** URL du PDF original du journal via le proxy interne (auth Bearer). */
export const getJournalPdfUrl = (id: string): string =>
  `${BASE}/legal-documents/${id}/pdf?type=journal`;

import { laravelClient } from '@/shared/api';

/**
 * reviewQueueApi.ts — File de revue priorisée et assignable (mibeko-front#33).
 *
 * Toutes les routes vivent sous /api/v1/* et sont protégées côté backend par
 * le middleware `role:editor|admin`. Réponses sur l'enveloppe standard
 * `{ success, message, data }`, paginée pour la liste.
 */

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type ReviewQueueStatus = 'draft' | 'review' | 'validated';

export interface ReviewQueueAssignee {
  id: string;
  name: string;
}

export interface ReviewQueueItem {
  id: string;
  titre_officiel: string;
  libelle_descriptif: string | null;
  type: { code: string; name: string } | null;
  curation_status: ReviewQueueStatus | 'published';
  curation_status_changed_at: string | null;
  updated_at: string | null;
  assigned_to: string | null;
  assignee: ReviewQueueAssignee | null;
  assigned_at: string | null;
  blocking_flags_count: number;
  warning_flags_count: number;
}

export interface ReviewQueueFilters {
  curation_status?: ReviewQueueStatus;
  assigned_to?: 'me' | 'unassigned';
  page?: number;
  per_page?: number;
}

export interface ReviewQueueListResult {
  data: ReviewQueueItem[];
  pagination: { total: number; per_page: number; current_page: number; last_page: number };
}

export const listReviewQueue = (filters: ReviewQueueFilters = {}): Promise<ReviewQueueListResult> => {
  const q = new URLSearchParams();
  q.set('curation_status', filters.curation_status ?? 'review');
  if (filters.assigned_to) q.set('assigned_to', filters.assigned_to);
  if (filters.page) q.set('page', String(filters.page));
  q.set('per_page', String(filters.per_page ?? 20));
  return laravelClient.get<ReviewQueueListResult>(`review-queue?${q.toString()}`).then((r) => r.data);
};

/** Prend en charge un document (auto-assignation). 409 si déjà pris par un autre éditeur. */
export const claimDocument = (id: string): Promise<ReviewQueueItem> =>
  laravelClient.post<Envelope<ReviewQueueItem>>(`legal-documents/${id}/claim`).then((r) => r.data.data);

/** Relâche un document : par son titulaire, ou par un admin pour débloquer. */
export const releaseDocument = (id: string): Promise<ReviewQueueItem> =>
  laravelClient.post<Envelope<ReviewQueueItem>>(`legal-documents/${id}/release`).then((r) => r.data.data);

export type CorrectionRequestSeverity = 'blocking' | 'warning';

export interface CorrectionRequestPayload {
  description: string;
  severity?: CorrectionRequestSeverity;
}

export interface CorrectionRequestResult {
  id: string;
  severity: CorrectionRequestSeverity;
  description: string | null;
  created_by: string | null;
  created_at: string | null;
}

/** Transmet une demande de correction tracée — bloquante par défaut. */
export const createCorrectionRequest = (
  id: string,
  payload: CorrectionRequestPayload,
): Promise<CorrectionRequestResult> =>
  laravelClient
    .post<Envelope<CorrectionRequestResult>>(`legal-documents/${id}/correction-requests`, payload)
    .then((r) => r.data.data);

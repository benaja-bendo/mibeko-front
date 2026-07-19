import { laravelClient } from '@/shared/api';

/**
 * adminApi.ts — Espace Administration (rôle admin).
 *
 * Toutes les routes vivent sous /api/v1/admin/* et sont protégées côté backend
 * par le middleware `role:admin`. Les réponses suivent l'enveloppe standard
 * `{ success, message, data }` ; les helpers ci-dessous renvoient directement
 * le contenu `data`.
 */

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

// ---------------------------------------------------------------------------
// Vue d'ensemble (KPIs)
// ---------------------------------------------------------------------------

export interface AdminOverview {
  content: { documents: number; articles: number; official_journals: number };
  referentiels: { document_types: number; institutions: number; tags: number };
  people: { users: number };
  attention: { open_flags: number; failed_extractions: number };
}

export const getAdminOverview = (): Promise<AdminOverview> =>
  laravelClient.get<Envelope<AdminOverview>>('admin/overview').then((r) => r.data.data);

// ---------------------------------------------------------------------------
// Référentiels — Types de documents (« types de loi »)
// ---------------------------------------------------------------------------

export interface DocumentTypeRef {
  code: string;
  name: string;
  hierarchy_level: number;
  documents_count: number;
}

export interface DocumentTypePayload {
  code: string;
  name: string;
  hierarchy_level: number;
}

export const listDocumentTypes = (): Promise<DocumentTypeRef[]> =>
  laravelClient.get<Envelope<DocumentTypeRef[]>>('admin/document-types').then((r) => r.data.data);

export const createDocumentType = (payload: DocumentTypePayload): Promise<DocumentTypeRef> =>
  laravelClient.post<Envelope<DocumentTypeRef>>('admin/document-types', payload).then((r) => r.data.data);

/** Le `code` est immuable : seuls le libellé et le niveau sont modifiables. */
export const updateDocumentType = (
  code: string,
  payload: Omit<DocumentTypePayload, 'code'>,
): Promise<DocumentTypeRef> =>
  laravelClient
    .patch<Envelope<DocumentTypeRef>>(`admin/document-types/${encodeURIComponent(code)}`, payload)
    .then((r) => r.data.data);

export const deleteDocumentType = (code: string): Promise<Envelope<null>> =>
  laravelClient
    .delete<Envelope<null>>(`admin/document-types/${encodeURIComponent(code)}`)
    .then((r) => r.data);

// ---------------------------------------------------------------------------
// Référentiels — Institutions
// ---------------------------------------------------------------------------

export interface InstitutionRef {
  id: string;
  name: string;
  acronym: string | null;
  documents_count: number;
}

export interface InstitutionPayload {
  name: string;
  acronym: string | null;
}

export const listInstitutions = (): Promise<InstitutionRef[]> =>
  laravelClient.get<Envelope<InstitutionRef[]>>('admin/institutions').then((r) => r.data.data);

export const createInstitution = (payload: InstitutionPayload): Promise<InstitutionRef> =>
  laravelClient.post<Envelope<InstitutionRef>>('admin/institutions', payload).then((r) => r.data.data);

export const updateInstitution = (id: string, payload: InstitutionPayload): Promise<InstitutionRef> =>
  laravelClient.patch<Envelope<InstitutionRef>>(`admin/institutions/${id}`, payload).then((r) => r.data.data);

export const deleteInstitution = (id: string): Promise<Envelope<null>> =>
  laravelClient.delete<Envelope<null>>(`admin/institutions/${id}`).then((r) => r.data);

// ---------------------------------------------------------------------------
// Référentiels — Tags
// ---------------------------------------------------------------------------

export interface TagRef {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  display_order: number;
  documents_count: number;
  articles_count: number;
  usage_count: number;
}

export interface TagPayload {
  name: string;
  slug?: string;
  icon?: string | null;
  description?: string | null;
  display_order?: number;
}

export const listTags = (): Promise<TagRef[]> =>
  laravelClient.get<Envelope<TagRef[]>>('admin/tags').then((r) => r.data.data);

export const createTag = (payload: TagPayload): Promise<TagRef> =>
  laravelClient.post<Envelope<TagRef>>('admin/tags', payload).then((r) => r.data.data);

export const updateTag = (id: string, payload: TagPayload): Promise<TagRef> =>
  laravelClient.patch<Envelope<TagRef>>(`admin/tags/${id}`, payload).then((r) => r.data.data);

export const deleteTag = (id: string): Promise<Envelope<null>> =>
  laravelClient.delete<Envelope<null>>(`admin/tags/${id}`).then((r) => r.data);

// ---------------------------------------------------------------------------
// Signalements (CurationFlag)
// ---------------------------------------------------------------------------

export type FlagStatus = 'open' | 'resolved' | 'all';

export interface FlagTarget {
  kind: 'document' | 'article';
  document_id: string | null;
  document_title: string | null;
  article_id: string | null;
  article_number: string | null;
}

export interface CurationFlagRef {
  id: string;
  type_probleme: string;
  description: string | null;
  resolved: boolean;
  created_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  target: FlagTarget;
}

export interface FlagFilters {
  status?: FlagStatus;
  type?: string;
  page?: number;
  per_page?: number;
}

export interface FlagListResult {
  data: CurationFlagRef[];
  pagination: { total: number; per_page: number; current_page: number; last_page: number };
}

export const listFlags = (filters: FlagFilters = {}): Promise<FlagListResult> => {
  const q = new URLSearchParams();
  q.set('status', filters.status ?? 'open');
  if (filters.type) q.set('type', filters.type);
  if (filters.page) q.set('page', String(filters.page));
  q.set('per_page', String(filters.per_page ?? 20));
  return laravelClient.get<FlagListResult>(`admin/flags?${q.toString()}`).then((r) => r.data);
};

/** Résout (true) ou ré-ouvre (false) un signalement. */
export const updateFlag = (id: string, resolved: boolean): Promise<CurationFlagRef> =>
  laravelClient.patch<Envelope<CurationFlagRef>>(`admin/flags/${id}`, { resolved }).then((r) => r.data.data);

export const deleteFlag = (id: string): Promise<Envelope<null>> =>
  laravelClient.delete<Envelope<null>>(`admin/flags/${id}`).then((r) => r.data);

/** Actions groupées sur une sélection de signalements. */
export type FlagBulkAction = 'resolve' | 'reopen' | 'delete';

/**
 * Applique une action à plusieurs signalements en une requête. Renvoie le
 * nombre de signalements réellement touchés et le message serveur (déjà
 * accordé en nombre) pour affichage direct.
 */
export const bulkFlags = (
  ids: string[],
  action: FlagBulkAction,
): Promise<{ affected: number; message: string }> =>
  laravelClient
    .post<Envelope<{ affected: number }>>('admin/flags/bulk', { ids, action })
    .then((r) => ({ affected: r.data.data.affected, message: r.data.message ?? '' }));

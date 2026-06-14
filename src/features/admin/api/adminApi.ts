import { apiFetch } from '@/features/documents/api/laravelApi';

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
  apiFetch<Envelope<AdminOverview>>('/admin/overview').then((r) => r.data);

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
  apiFetch<Envelope<DocumentTypeRef[]>>('/admin/document-types').then((r) => r.data);

export const createDocumentType = (payload: DocumentTypePayload): Promise<DocumentTypeRef> =>
  apiFetch<Envelope<DocumentTypeRef>>('/admin/document-types', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((r) => r.data);

/** Le `code` est immuable : seuls le libellé et le niveau sont modifiables. */
export const updateDocumentType = (
  code: string,
  payload: Omit<DocumentTypePayload, 'code'>,
): Promise<DocumentTypeRef> =>
  apiFetch<Envelope<DocumentTypeRef>>(`/admin/document-types/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((r) => r.data);

export const deleteDocumentType = (code: string): Promise<Envelope<null>> =>
  apiFetch<Envelope<null>>(`/admin/document-types/${encodeURIComponent(code)}`, { method: 'DELETE' });

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
  apiFetch<Envelope<InstitutionRef[]>>('/admin/institutions').then((r) => r.data);

export const createInstitution = (payload: InstitutionPayload): Promise<InstitutionRef> =>
  apiFetch<Envelope<InstitutionRef>>('/admin/institutions', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((r) => r.data);

export const updateInstitution = (id: string, payload: InstitutionPayload): Promise<InstitutionRef> =>
  apiFetch<Envelope<InstitutionRef>>(`/admin/institutions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((r) => r.data);

export const deleteInstitution = (id: string): Promise<Envelope<null>> =>
  apiFetch<Envelope<null>>(`/admin/institutions/${id}`, { method: 'DELETE' });

// ---------------------------------------------------------------------------
// Référentiels — Tags
// ---------------------------------------------------------------------------

export interface TagRef {
  id: string;
  name: string;
  slug: string;
  documents_count: number;
  articles_count: number;
  usage_count: number;
}

export interface TagPayload {
  name: string;
  slug?: string;
}

export const listTags = (): Promise<TagRef[]> =>
  apiFetch<Envelope<TagRef[]>>('/admin/tags').then((r) => r.data);

export const createTag = (payload: TagPayload): Promise<TagRef> =>
  apiFetch<Envelope<TagRef>>('/admin/tags', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((r) => r.data);

export const updateTag = (id: string, payload: TagPayload): Promise<TagRef> =>
  apiFetch<Envelope<TagRef>>(`/admin/tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((r) => r.data);

export const deleteTag = (id: string): Promise<Envelope<null>> =>
  apiFetch<Envelope<null>>(`/admin/tags/${id}`, { method: 'DELETE' });

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
  return apiFetch<FlagListResult>(`/admin/flags?${q.toString()}`);
};

/** Résout (true) ou ré-ouvre (false) un signalement. */
export const updateFlag = (id: string, resolved: boolean): Promise<CurationFlagRef> =>
  apiFetch<Envelope<CurationFlagRef>>(`/admin/flags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ resolved }),
  }).then((r) => r.data);

export const deleteFlag = (id: string): Promise<Envelope<null>> =>
  apiFetch<Envelope<null>>(`/admin/flags/${id}`, { method: 'DELETE' });

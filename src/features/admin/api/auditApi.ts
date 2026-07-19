import { laravelClient } from '@/shared/api/laravelClient';

/**
 * auditApi.ts — Journal d'activité (espace admin).
 *
 * Routes sous /api/v1/admin/audits/* protégées par `role:admin`. La resource
 * backend produit déjà un payload lisible (summary/object/changes) : le front
 * ne manipule pas de JSON brut.
 */

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditEvent = 'created' | 'updated' | 'deleted' | 'restored' | 'impersonation_started' | 'roles_updated';

export interface AuditChange {
  field: string;
  field_label: string;
  old: unknown;
  new: unknown;
}

export interface AuditEntry {
  id: number;
  event: string;
  event_label: string;
  actor: { id: string; name: string } | null;
  object: {
    type: string;
    type_label: string;
    id: string;
    label: string;
    link: string | null;
  };
  summary: string;
  changes: AuditChange[];
  ip_address: string | null;
  url: string | null;
  user_agent: string | null;
  tags: string | null;
  created_at: string | null;
}

export interface AuditStats {
  today: number;
  last_7_days: number;
  last_30_days: number;
  by_event: { event: string; count: number }[];
  top_actors: { id: string; name: string; count: number }[];
}

export interface AuditFilterOptions {
  types: { value: string; label: string }[];
  actors: { id: string; name: string }[];
  events: string[];
}

export type AuditPeriod = 'today' | '7d' | '30d' | 'all';
export type AuditPreset = 'sensitive' | 'mine';

export interface AuditFilters {
  period?: AuditPeriod;
  from?: string;
  to?: string;
  event?: string;
  auditable_type?: string;
  user_id?: string;
  q?: string;
  preset?: AuditPreset;
  page?: number;
  per_page?: number;
}

export interface AuditListResult {
  data: AuditEntry[];
  pagination: Pagination;
}

// ---------------------------------------------------------------------------
// Construction de la query string commune
// ---------------------------------------------------------------------------

function toQuery(filters: AuditFilters): URLSearchParams {
  const q = new URLSearchParams();
  if (filters.period) q.set('period', filters.period);
  if (filters.from) q.set('from', filters.from);
  if (filters.to) q.set('to', filters.to);
  if (filters.event) q.set('event', filters.event);
  if (filters.auditable_type) q.set('auditable_type', filters.auditable_type);
  if (filters.user_id) q.set('user_id', filters.user_id);
  if (filters.q) q.set('q', filters.q);
  if (filters.preset) q.set('preset', filters.preset);
  if (filters.page) q.set('page', String(filters.page));
  if (filters.per_page) q.set('per_page', String(filters.per_page));
  return q;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const listAudits = (filters: AuditFilters = {}): Promise<AuditListResult> =>
  laravelClient.get<AuditListResult>(`admin/audits?${toQuery(filters).toString()}`).then((r) => r.data);

export const getAuditStats = (): Promise<AuditStats> =>
  laravelClient.get<Envelope<AuditStats>>('admin/audits/stats').then((r) => r.data.data);

export const getAuditFilters = (): Promise<AuditFilterOptions> =>
  laravelClient.get<Envelope<AuditFilterOptions>>('admin/audits/filters').then((r) => r.data.data);

export const getAudit = (id: number): Promise<AuditEntry> =>
  laravelClient.get<Envelope<AuditEntry>>(`admin/audits/${id}`).then((r) => r.data.data);

export const purgeAudits = (olderThanDays: number): Promise<{ deleted: number }> =>
  laravelClient
    .delete<Envelope<{ deleted: number }>>('admin/audits', { data: { older_than_days: olderThanDays } })
    .then((r) => r.data.data);

/**
 * Télécharge le CSV des entrées filtrées. Passe par l'axios authentifié
 * (header Bearer) puis déclenche le téléchargement côté navigateur.
 */
export async function downloadAuditsCsv(filters: AuditFilters = {}): Promise<void> {
  const res = await laravelClient.get(`/admin/audits/export?${toQuery(filters).toString()}`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `journal-activite-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

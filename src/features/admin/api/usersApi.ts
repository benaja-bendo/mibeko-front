import { laravelClient } from '@/shared/api';
import type { User, UserRole } from '@/shared/types/auth';

/**
 * usersApi.ts — Gestion des utilisateurs (espace admin).
 *
 * Routes sous /api/v1/admin/users|invitations/* protégées par `role:admin`,
 * plus l'acceptation publique /api/v1/invitations/accept. Enveloppe standard
 * `{ success, message, data }` ; les helpers renvoient directement le contenu.
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

export type UserStatus = 'active' | 'suspended' | 'pending';

/** Rôles attribuables depuis l'interface (alignés sur le RBAC backend). */
export const ROLE_OPTIONS: { value: UserRole; label: string; segment: 'team' | 'client' }[] = [
  { value: 'admin', label: 'Administrateur', segment: 'team' },
  { value: 'editor', label: 'Éditeur', segment: 'team' },
  { value: 'user_pro', label: 'Utilisateur Pro', segment: 'client' },
  { value: 'mobile_user', label: 'Utilisateur mobile', segment: 'client' },
];

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label]),
);

/**
 * Catalogue de permissions granulaires (aligné sur RolesAndPermissionsSeeder
 * côté backend), pour l'attribution directe par-dessus les rôles.
 */
export const PERMISSION_CATALOG: { group: string; permissions: string[] }[] = [
  { group: 'Documents', permissions: ['documents.view', 'documents.create', 'documents.update', 'documents.delete', 'documents.publish'] },
  { group: 'Articles', permissions: ['articles.view', 'articles.create', 'articles.update', 'articles.delete'] },
  { group: 'Structure & ingestion', permissions: ['structure.manage', 'ingestion.upload', 'ingestion.parse', 'ingestion.delete'] },
  { group: 'Administration', permissions: ['users.view', 'users.manage', 'roles.manage'] },
  { group: 'Pro', permissions: ['assistant.use', 'export.use', 'library.access'] },
];

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  status: UserStatus;
  roles: string[];
  is_online: boolean;
  last_seen_at: string | null;
  two_factor_enabled: boolean;
  has_active_subscription: boolean;
  created_at: string | null;
  deleted_at: string | null;
}

export interface AuditEntry {
  id: number;
  event: string;
  tags: string | null;
  changed: string[];
  actor_id: string | null;
  actor_name: string | null;
  created_at: string | null;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  email_verified_at: string | null;
  status: UserStatus;
  suspended_at: string | null;
  suspension_reason: string | null;
  is_online: boolean;
  last_seen_at: string | null;
  two_factor_enabled: boolean;
  active_tokens_count: number;
  roles: string[];
  permissions_direct: string[];
  permissions_effective: string[];
  settings: {
    locale: string;
    timezone: string;
    marketing_consent: boolean;
    analytics_consent: boolean;
  } | null;
  dossiers_count: number;
  conversations_count: number;
  subscription: {
    name: string;
    stripe_status: string;
    ends_at: string | null;
    on_grace_period: boolean;
    active: boolean;
  } | null;
  recent_audits: AuditEntry[];
  created_at: string | null;
  deleted_at: string | null;
}

export interface UserStats {
  total: number;
  active: number;
  suspended: number;
  pending: number;
  online: number;
  new_last_7_days: number;
  new_last_30_days: number;
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: UserStatus;
  segment?: 'team' | 'client';
  online?: boolean;
  verified?: boolean;
  trashed?: 'with' | 'only';
  page?: number;
  per_page?: number;
}

export interface UserListResult {
  data: AdminUserRow[];
  pagination: Pagination;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password?: string;
  roles: string[];
  mark_verified?: boolean;
}

export interface UpdateUserPayload {
  name?: string;
  status?: UserStatus;
  suspension_reason?: string | null;
  roles?: string[];
  permissions?: string[];
}

export interface InvitationRef {
  id: string;
  email: string;
  roles: string[];
  status: 'pending' | 'accepted' | 'expired';
  invited_by: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string | null;
}

export interface CreateInvitationPayload {
  email: string;
  roles: string[];
}

// ---------------------------------------------------------------------------
// Utilisateurs
// ---------------------------------------------------------------------------

export const listUsers = (filters: UserFilters = {}): Promise<UserListResult> => {
  const q = new URLSearchParams();
  if (filters.search) q.set('search', filters.search);
  if (filters.role) q.set('role', filters.role);
  if (filters.status) q.set('status', filters.status);
  if (filters.segment) q.set('segment', filters.segment);
  if (filters.online) q.set('online', '1');
  if (filters.verified !== undefined) q.set('verified', filters.verified ? '1' : '0');
  if (filters.trashed) q.set('trashed', filters.trashed);
  if (filters.page) q.set('page', String(filters.page));
  q.set('per_page', String(filters.per_page ?? 20));
  return laravelClient.get<UserListResult>(`admin/users?${q.toString()}`).then((r) => r.data);
};

export const getUserStats = (): Promise<UserStats> =>
  laravelClient.get<Envelope<UserStats>>('admin/users/stats').then((r) => r.data.data);

export const getUser = (id: string): Promise<AdminUserDetail> =>
  laravelClient.get<Envelope<AdminUserDetail>>(`admin/users/${id}`).then((r) => r.data.data);

export const createUser = (
  payload: CreateUserPayload,
): Promise<{ user: AdminUserRow; generated_password: string | null }> =>
  laravelClient
    .post<Envelope<{ user: AdminUserRow; generated_password: string | null }>>('admin/users', payload)
    .then((r) => r.data.data);

export const updateUser = (id: string, payload: UpdateUserPayload): Promise<AdminUserRow> =>
  laravelClient.patch<Envelope<AdminUserRow>>(`admin/users/${id}`, payload).then((r) => r.data.data);

export const deleteUser = (id: string): Promise<Envelope<null>> =>
  laravelClient.delete<Envelope<null>>(`admin/users/${id}`).then((r) => r.data);

export const restoreUser = (id: string): Promise<AdminUserRow> =>
  laravelClient.post<Envelope<AdminUserRow>>(`admin/users/${id}/restore`).then((r) => r.data.data);

export const sendUserPasswordReset = (id: string): Promise<Envelope<null>> =>
  laravelClient.post<Envelope<null>>(`admin/users/${id}/password-reset`).then((r) => r.data);

export const revokeUserTokens = (id: string): Promise<{ revoked: number }> =>
  laravelClient
    .post<Envelope<{ revoked: number }>>(`admin/users/${id}/revoke-tokens`)
    .then((r) => r.data.data);

export const verifyUserEmail = (id: string): Promise<Envelope<null>> =>
  laravelClient.post<Envelope<null>>(`admin/users/${id}/verify-email`).then((r) => r.data);

export const disableUserTwoFactor = (id: string): Promise<Envelope<null>> =>
  laravelClient.delete<Envelope<null>>(`admin/users/${id}/two-factor`).then((r) => r.data);

export const impersonateUser = (id: string): Promise<{ token: string; user: User }> =>
  laravelClient
    .post<Envelope<{ token: string; user: User }>>(`admin/users/${id}/impersonate`)
    .then((r) => r.data.data);

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export const listInvitations = (): Promise<InvitationRef[]> =>
  laravelClient.get<Envelope<InvitationRef[]>>('admin/invitations').then((r) => r.data.data);

export const createInvitation = (payload: CreateInvitationPayload): Promise<InvitationRef> =>
  laravelClient.post<Envelope<InvitationRef>>('admin/invitations', payload).then((r) => r.data.data);

export const resendInvitation = (id: string): Promise<InvitationRef> =>
  laravelClient
    .post<Envelope<InvitationRef>>(`admin/invitations/${id}/resend`)
    .then((r) => r.data.data);

export const deleteInvitation = (id: string): Promise<Envelope<null>> =>
  laravelClient.delete<Envelope<null>>(`admin/invitations/${id}`).then((r) => r.data);

export interface AcceptInvitationPayload {
  email: string;
  token: string;
  name: string;
  password: string;
  password_confirmation: string;
}

export const acceptInvitation = (
  payload: AcceptInvitationPayload,
): Promise<{ token: string; user: User }> =>
  laravelClient
    .post<Envelope<{ token: string; user: User }>>('invitations/accept', {
      ...payload,
      device_name: 'mibeko-saas-web',
    })
    .then((r) => r.data.data);

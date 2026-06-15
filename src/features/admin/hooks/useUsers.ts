import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listUsers,
  getUserStats,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  restoreUser,
  sendUserPasswordReset,
  revokeUserTokens,
  verifyUserEmail,
  disableUserTwoFactor,
  impersonateUser,
  listInvitations,
  createInvitation,
  resendInvitation,
  deleteInvitation,
  type UserFilters,
  type CreateUserPayload,
  type UpdateUserPayload,
  type CreateInvitationPayload,
} from '@/features/admin/api/usersApi';

const STALE = 30 * 1000;

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: () => listUsers(filters),
    placeholderData: (previous) => previous,
    staleTime: STALE,
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: ['admin', 'users', 'stats'],
    queryFn: getUserStats,
    staleTime: STALE,
  });
}

export function useUser(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => getUser(id as string),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutations utilisateur
// ---------------------------------------------------------------------------

export function useUserMutations(id?: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    if (id) qc.invalidateQueries({ queryKey: ['admin', 'user', id] });
  };

  const create = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateUserPayload }) =>
      updateUser(userId, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: invalidate,
  });
  const restore = useMutation({
    mutationFn: (userId: string) => restoreUser(userId),
    onSuccess: invalidate,
  });
  const passwordReset = useMutation({
    mutationFn: (userId: string) => sendUserPasswordReset(userId),
  });
  const revokeTokens = useMutation({
    mutationFn: (userId: string) => revokeUserTokens(userId),
    onSuccess: invalidate,
  });
  const verifyEmail = useMutation({
    mutationFn: (userId: string) => verifyUserEmail(userId),
    onSuccess: invalidate,
  });
  const disableTwoFactor = useMutation({
    mutationFn: (userId: string) => disableUserTwoFactor(userId),
    onSuccess: invalidate,
  });

  return { create, update, remove, restore, passwordReset, revokeTokens, verifyEmail, disableTwoFactor };
}

export function useImpersonate() {
  return useMutation({
    mutationFn: (userId: string) => impersonateUser(userId),
  });
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export function useInvitations() {
  return useQuery({
    queryKey: ['admin', 'invitations'],
    queryFn: listInvitations,
    staleTime: STALE,
  });
}

export function useInvitationMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'invitations'] });

  const create = useMutation({
    mutationFn: (payload: CreateInvitationPayload) => createInvitation(payload),
    onSuccess: invalidate,
  });
  const resend = useMutation({
    mutationFn: (id: string) => resendInvitation(id),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteInvitation(id),
    onSuccess: invalidate,
  });

  return { create, resend, remove };
}

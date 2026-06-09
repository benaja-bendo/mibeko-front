/**
 * useSettings.ts — Hooks TanStack Query pour le domaine « Paramètres / Profil ».
 *
 * Convention du repo : l'état serveur vit dans React Query ; le store Zustand
 * d'auth n'est mis à jour que pour refléter l'identité affichée (nom) dans le layout.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  confirmTwoFactor,
  deleteAccount,
  disableTwoFactor,
  enableTwoFactor,
  getAccount,
  getSessions,
  getTwoFactor,
  regenerateRecoveryCodes,
  revokeOtherSessions,
  revokeSession,
  updateConsents,
  updateNotificationPreferences,
  updatePassword,
  updatePreferences,
  updateProfile,
} from '@/features/settings/api/settingsApi';
import type {
  NotificationMatrix,
  UpdateConsentsPayload,
  UpdatePasswordPayload,
  UpdatePreferencesPayload,
  UpdateProfilePayload,
} from '@/features/settings/types';

export const settingsKeys = {
  all: ['settings'] as const,
  account: () => [...settingsKeys.all, 'account'] as const,
  sessions: () => [...settingsKeys.all, 'sessions'] as const,
  twoFactor: () => [...settingsKeys.all, 'two-factor'] as const,
};

/** Compte complet (source de vérité de toutes les pages Paramètres). */
export function useAccount() {
  return useQuery({
    queryKey: settingsKeys.account(),
    queryFn: getAccount,
    staleTime: 30_000,
  });
}

/** Sessions actives. */
export function useSessions() {
  return useQuery({
    queryKey: settingsKeys.sessions(),
    queryFn: getSessions,
    staleTime: 15_000,
  });
}

/** État du 2FA. */
export function useTwoFactor() {
  return useQuery({
    queryKey: settingsKeys.twoFactor(),
    queryFn: getTwoFactor,
    staleTime: 15_000,
  });
}

/** Mise à jour des informations personnelles + synchro du nom dans le layout. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (account) => {
      qc.setQueryData(settingsKeys.account(), account);
      // Garde le nom affiché dans la sidebar cohérent avec le profil mis à jour.
      if (user) {
        setUser({ ...user, name: account.name, email: account.email });
      }
    },
  });
}

/** Changement de mot de passe. */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: (payload: UpdatePasswordPayload) => updatePassword(payload),
  });
}

/** Préférences d'affichage. */
export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePreferencesPayload) => updatePreferences(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.account() }),
  });
}

/** Préférences de notification (matrice complète). */
export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (preferences: NotificationMatrix) =>
      updateNotificationPreferences(preferences),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.account() }),
  });
}

/** Consentements RGPD. */
export function useUpdateConsents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateConsentsPayload) => updateConsents(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.account() }),
  });
}

/** Démarrage de l'activation 2FA (retourne QR + recovery codes). */
export function useEnableTwoFactor() {
  return useMutation({
    mutationFn: (currentPassword: string) => enableTwoFactor(currentPassword),
  });
}

/** Confirmation du 2FA par code TOTP. */
export function useConfirmTwoFactor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => confirmTwoFactor(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.twoFactor() });
      qc.invalidateQueries({ queryKey: settingsKeys.account() });
    },
  });
}

/** Régénération des codes de récupération. */
export function useRegenerateRecoveryCodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (currentPassword: string) => regenerateRecoveryCodes(currentPassword),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.twoFactor() }),
  });
}

/** Désactivation du 2FA. */
export function useDisableTwoFactor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (currentPassword: string) => disableTwoFactor(currentPassword),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.twoFactor() });
      qc.invalidateQueries({ queryKey: settingsKeys.account() });
    },
  });
}

/** Révocation d'une session. */
export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.sessions() }),
  });
}

/** Révocation de toutes les autres sessions. */
export function useRevokeOtherSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => revokeOtherSessions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.sessions() }),
  });
}

/** Suppression du compte (le caller gère la déconnexion/redirection). */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: (currentPassword: string) => deleteAccount(currentPassword),
  });
}

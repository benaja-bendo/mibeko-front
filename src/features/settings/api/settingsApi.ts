/**
 * settingsApi.ts — Client des endpoints « Profil / Paramètres » (backend Laravel).
 *
 * Toutes les réponses suivent l'enveloppe { success, message, data } ; on déballe
 * systématiquement `data.data`. Le client `laravelClient` injecte le Bearer token
 * et redirige sur 401.
 */

import { laravelClient } from '@/shared/api';
import type {
  AccountProfile,
  AccountSettings,
  SessionItem,
  TwoFactorSetup,
  TwoFactorStatus,
  UpdateConsentsPayload,
  UpdatePasswordPayload,
  UpdatePreferencesPayload,
  UpdateProfilePayload,
  NotificationMatrix,
} from '@/features/settings/types';

// ── Compte / profil ────────────────────────────────────────────────────────

/** Charge le compte complet (identité, profil, rôles, sécurité, préférences). */
export async function getAccount(): Promise<AccountProfile> {
  const { data } = await laravelClient.get('profile');
  return data.data;
}

/** Met à jour les informations personnelles. */
export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<AccountProfile> {
  const { data } = await laravelClient.put('profile', payload);
  return data.data;
}

/** Change le mot de passe (révoque les autres sessions côté serveur). */
export async function updatePassword(payload: UpdatePasswordPayload): Promise<void> {
  await laravelClient.put('profile/password', payload);
}

// ── Préférences ──────────────────────────────────────────────────────────────

/** Récupère les préférences (localisation + notifications + consentements). */
export async function getPreferences(): Promise<AccountSettings> {
  const { data } = await laravelClient.get('profile/preferences');
  return data.data;
}

/** Met à jour les préférences d'affichage. */
export async function updatePreferences(
  payload: UpdatePreferencesPayload,
): Promise<AccountSettings> {
  const { data } = await laravelClient.put('profile/preferences', payload);
  return data.data;
}

/** Remplace la matrice complète de préférences de notification. */
export async function updateNotificationPreferences(
  preferences: NotificationMatrix,
): Promise<AccountSettings> {
  const { data } = await laravelClient.put('profile/notification-preferences', {
    preferences,
  });
  return data.data;
}

/** Met à jour les consentements RGPD (bascules indépendantes). */
export async function updateConsents(
  payload: UpdateConsentsPayload,
): Promise<AccountSettings> {
  const { data } = await laravelClient.put('profile/consents', payload);
  return data.data;
}

// ── Sécurité : 2FA ───────────────────────────────────────────────────────────

/** État courant du 2FA. */
export async function getTwoFactor(): Promise<TwoFactorStatus> {
  const { data } = await laravelClient.get('profile/two-factor');
  return data.data;
}

/** Démarre l'activation : renvoie QR + codes de récupération (non confirmé). */
export async function enableTwoFactor(currentPassword: string): Promise<TwoFactorSetup> {
  const { data } = await laravelClient.post('profile/two-factor', {
    current_password: currentPassword,
  });
  return data.data;
}

/** Confirme l'activation avec un code TOTP. */
export async function confirmTwoFactor(code: string): Promise<void> {
  await laravelClient.post('profile/two-factor/confirm', { code });
}

/** Régénère les codes de récupération. */
export async function regenerateRecoveryCodes(
  currentPassword: string,
): Promise<string[]> {
  const { data } = await laravelClient.post('profile/two-factor/recovery-codes', {
    current_password: currentPassword,
  });
  return data.data.recovery_codes;
}

/** Désactive le 2FA. */
export async function disableTwoFactor(currentPassword: string): Promise<void> {
  // Axios DELETE transporte le corps via la clé `data`.
  await laravelClient.delete('profile/two-factor', {
    data: { current_password: currentPassword },
  });
}

// ── Sécurité : sessions ──────────────────────────────────────────────────────

/** Liste les sessions actives. */
export async function getSessions(): Promise<SessionItem[]> {
  const { data } = await laravelClient.get('profile/sessions');
  return data.data;
}

/** Révoque une session précise. */
export async function revokeSession(id: number): Promise<void> {
  await laravelClient.delete(`profile/sessions/${id}`);
}

/** Révoque toutes les sessions sauf la courante. */
export async function revokeOtherSessions(): Promise<void> {
  await laravelClient.delete('profile/sessions/others');
}

// ── Conformité RGPD ──────────────────────────────────────────────────────────

/** Télécharge l'export des données personnelles (déclenche le téléchargement navigateur). */
export async function exportPersonalData(): Promise<void> {
  const response = await laravelClient.get('profile/export', { responseType: 'blob' });

  const url = window.URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  // Récupère le nom de fichier proposé par le serveur si présent.
  const disposition = response.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  link.download = match?.[1] ?? 'mibeko-donnees.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/** Supprime définitivement le compte (droit à l'effacement). */
export async function deleteAccount(currentPassword: string): Promise<void> {
  await laravelClient.delete('profile', {
    data: { current_password: currentPassword },
  });
}

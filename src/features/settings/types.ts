/**
 * types.ts — Modèles du domaine « Paramètres / Profil ».
 *
 * Alignés sur les Resources Laravel (UserProfileResource, UserSettingResource,
 * PersonalAccessTokenResource) exposées sous /api/v1/profile/*.
 */

export type Locale = 'fr' | 'en';
export type NotificationFrequency = 'instant' | 'daily' | 'weekly';

/** Types de notification (clés stables, miroir de UserSetting::NOTIFICATION_TYPES). */
export const NOTIFICATION_TYPES = [
  'extraction_update',
  'new_document',
  'share',
  'legal_alert',
  'system',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationChannel = 'email' | 'push' | 'in_app';

/** Matrice canal × type + fréquence de regroupement (clé technique `_frequency`). */
export type NotificationMatrix = Record<
  NotificationType,
  Record<NotificationChannel, boolean>
> & { _frequency: NotificationFrequency };

export interface AccountConsents {
  marketing: boolean;
  marketing_at: string | null;
  analytics: boolean;
  analytics_at: string | null;
}

export interface AccountSettings {
  locale: Locale;
  theme: string;
  timezone: string;
  date_format: string;
  notification_preferences: NotificationMatrix;
  consents: AccountConsents;
}

export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  status: string | null;
  profile: {
    phone: string | null;
    profession: string | null;
    company: string | null;
  };
  /** Rôles & permissions : lecture seule côté client. */
  roles: string[];
  permissions: string[];
  security: {
    two_factor_enabled: boolean;
    two_factor_confirmed: boolean;
  };
  settings: AccountSettings;
  created_at: string | null;
}

/** Session active = un jeton Sanctum (un appareil/navigateur). */
export interface SessionItem {
  id: number;
  name: string;
  last_used_at: string | null;
  created_at: string | null;
  is_current: boolean;
}

export interface TwoFactorStatus {
  enabled: boolean;
  confirmed: boolean;
  recovery_codes_count: number;
}

/** Payload renvoyé au démarrage de l'activation 2FA (QR + codes de secours). */
export interface TwoFactorSetup {
  svg: string;
  otpauth_url: string;
  recovery_codes: string[];
}

// ── Payloads d'écriture ───────────────────────────────────────────────────────

export interface UpdateProfilePayload {
  name?: string;
  phone?: string | null;
  profession?: string | null;
  company?: string | null;
}

export interface UpdatePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface UpdatePreferencesPayload {
  locale?: Locale;
  theme?: string;
  timezone?: string;
  date_format?: string;
}

export interface UpdateConsentsPayload {
  marketing?: boolean;
  analytics?: boolean;
}

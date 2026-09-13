import { laravelClient } from '@/shared/api';
import type { OnboardingStepType } from '@/features/onboarding/types';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type AdminOnboardingStatus = 'draft' | 'published' | 'archived';
export type AdminOnboardingScope = 'common' | 'web' | 'mobile';
export type AdminOnboardingBinding =
  | 'profile.usage_context'
  | 'profile.job_title'
  | 'profile.company'
  | 'profile.phone'
  | 'profile.interests';

export interface AdminOnboardingCondition {
  step_key: string;
  operator: 'equals' | 'not_equals' | 'in';
  value: unknown;
}

export interface AdminOnboardingOption {
  code: string;
  label?: string;
  label_key?: string;
}

export interface AdminOnboardingStep {
  key: string;
  type: OnboardingStepType;
  scope: AdminOnboardingScope;
  binding: AdminOnboardingBinding | null;
  config: {
    title?: string;
    body?: string;
    cta?: string;
    title_key?: string;
    body_key?: string;
    cta_key?: string;
    options?: AdminOnboardingOption[];
    items?: AdminOnboardingOption[];
    source?: 'tags:themes-de-vie';
    placeholder?: string;
    examples?: string[];
  };
  conditions: AdminOnboardingCondition[];
}

export interface AdminOnboardingJourney {
  id: string;
  key: string;
  version: number;
  status: AdminOnboardingStatus;
  is_active: boolean;
  definition: AdminOnboardingStep[];
  steps_count: number;
  enrollments_count: number;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_editable: boolean;
  targeting: { new_accounts_only: boolean; existing_enrollments_keep_version: boolean };
}

export interface OnboardingPreview {
  platform: 'web' | 'mobile';
  steps: Array<AdminOnboardingStep & { supported: boolean }>;
  writes_user_data: false;
  uses_ai: false;
}

export interface OnboardingValidation {
  valid: true;
  steps_count: number;
  platforms: Array<'web' | 'mobile'>;
}

export const listOnboardingJourneys = (): Promise<AdminOnboardingJourney[]> =>
  laravelClient.get<Envelope<AdminOnboardingJourney[]>>('admin/onboarding-journeys').then((r) => r.data.data);

export const createOnboardingDraft = (): Promise<AdminOnboardingJourney> =>
  laravelClient.post<Envelope<AdminOnboardingJourney>>('admin/onboarding-journeys/drafts').then((r) => r.data.data);

export const updateOnboardingDraft = (id: string, definition: AdminOnboardingStep[]): Promise<AdminOnboardingJourney> =>
  laravelClient.patch<Envelope<AdminOnboardingJourney>>(`admin/onboarding-journeys/${id}`, { definition }).then((r) => r.data.data);

export const validateOnboarding = (definition: AdminOnboardingStep[]): Promise<OnboardingValidation> =>
  laravelClient.post<Envelope<OnboardingValidation>>('admin/onboarding-journeys/validate', {
    definition,
    platform: 'web',
  }).then((r) => r.data.data);

export const previewOnboarding = (payload: {
  definition: AdminOnboardingStep[];
  platform: 'web' | 'mobile';
  known_step_types?: OnboardingStepType[];
  answers?: Record<string, unknown>;
}): Promise<OnboardingPreview> =>
  laravelClient.post<Envelope<OnboardingPreview>>('admin/onboarding-journeys/preview', payload).then((r) => r.data.data);

export const publishOnboardingDraft = (id: string): Promise<AdminOnboardingJourney> =>
  laravelClient.post<Envelope<AdminOnboardingJourney>>(`admin/onboarding-journeys/${id}/publish`).then((r) => r.data.data);

export const rollbackOnboarding = (id: string): Promise<AdminOnboardingJourney> =>
  laravelClient.post<Envelope<AdminOnboardingJourney>>(`admin/onboarding-journeys/${id}/rollback`).then((r) => r.data.data);

export const archiveOnboardingJourney = (id: string): Promise<AdminOnboardingJourney> =>
  laravelClient.post<Envelope<AdminOnboardingJourney>>(`admin/onboarding-journeys/${id}/archive`).then((r) => r.data.data);

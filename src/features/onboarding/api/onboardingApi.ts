/**
 * onboardingApi.ts — Client des endpoints « Onboarding » (mibeko-dashboard#136).
 *
 * Enveloppe { success, message, data } comme le reste du dépôt (cf.
 * `settingsApi.ts`) ; on déballe systématiquement `data.data`.
 */

import { laravelClient } from '@/shared/api';
import type {
  OnboardingJourneyResponse,
  OnboardingPlatform,
  OnboardingStepMutationPayload,
  OnboardingStepMutationResponse,
  OnboardingStepType,
} from '@/features/onboarding/types';

/** Types d'étape que ce client web sait rendre — toute étape d'un autre type est annotée `supported:false` par le serveur, jamais bloquant. */
export const KNOWN_STEP_TYPES: OnboardingStepType[] = [
  'welcome',
  'single_choice',
  'multi_choice',
  'guided_action',
];

/** Parcours applicable + progression du compte courant. */
export async function getOnboardingJourney(
  platform: OnboardingPlatform = 'web',
): Promise<OnboardingJourneyResponse> {
  const { data } = await laravelClient.get('onboarding/journey', {
    params: { platform, known_step_types: KNOWN_STEP_TYPES },
  });
  return data.data;
}

/** Enregistre une vue, une réponse ou un passage sur une étape. */
export async function updateOnboardingStep(
  stepKey: string,
  payload: OnboardingStepMutationPayload,
): Promise<OnboardingStepMutationResponse> {
  const { data } = await laravelClient.patch(`onboarding/steps/${stepKey}`, payload);
  return data.data;
}

/** Reporte le parcours entier (pas une étape). */
export async function postponeOnboarding(clientMutationId: string): Promise<{ enrollment: OnboardingJourneyResponse['enrollment'] }> {
  const { data } = await laravelClient.post('onboarding/postpone', {
    client_mutation_id: clientMutationId,
  });
  return data.data;
}

/** Rejoue un guide déjà terminé (uniquement si `enrollment.status === 'completed'`). */
export async function replayOnboarding(clientMutationId: string): Promise<{ enrollment: OnboardingJourneyResponse['enrollment'] }> {
  const { data } = await laravelClient.post('onboarding/replay', {
    client_mutation_id: clientMutationId,
  });
  return data.data;
}

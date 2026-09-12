/**
 * useOnboardingReplay.ts — Relance un guide déjà terminé. Le serveur ne
 * réinitialise AUCUNE `onboarding_step_progress` (mibeko-dashboard#136,
 * `OnboardingController::replay()`) : c'est à l'appelant (`OnboardingHost`)
 * de forcer l'ouverture sur la première étape plutôt que d'appliquer la
 * logique normale « première étape non résolue », qui ne trouverait rien.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClientId } from '@/shared/lib/clientId';
import { replayOnboarding } from '@/features/onboarding/api/onboardingApi';
import { onboardingKeys } from '@/features/onboarding/hooks/useOnboardingJourney';
import type { OnboardingJourneyResponse } from '@/features/onboarding/types';

export function useOnboardingReplay() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => replayOnboarding(generateClientId()),
    onSuccess: (result) => {
      qc.setQueryData<OnboardingJourneyResponse>(onboardingKeys.journey('web'), (prev) =>
        prev ? { ...prev, enrollment: result.enrollment } : prev,
      );
    },
  });
}

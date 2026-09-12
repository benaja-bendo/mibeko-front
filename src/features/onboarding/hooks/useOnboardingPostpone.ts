/**
 * useOnboardingPostpone.ts — Reporte le parcours ENTIER (pas une étape).
 * Utilisé aussi bien par le bouton « Plus tard » que par la fermeture de la
 * modale (X, Échap, clic extérieur) et par le masquage de la checklist : une
 * seule mutation, pour ne jamais laisser `enrollment.status` à
 * `not_started`/`in_progress` après une fermeture qui rouvrirait l'accueil
 * au prochain chargement.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClientId } from '@/shared/lib/clientId';
import { postponeOnboarding } from '@/features/onboarding/api/onboardingApi';
import { onboardingKeys } from '@/features/onboarding/hooks/useOnboardingJourney';
import type { OnboardingJourneyResponse } from '@/features/onboarding/types';

export function useOnboardingPostpone() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => postponeOnboarding(generateClientId()),
    onSuccess: (result) => {
      qc.setQueryData<OnboardingJourneyResponse>(onboardingKeys.journey('web'), (prev) =>
        prev ? { ...prev, enrollment: result.enrollment } : prev,
      );
    },
  });
}

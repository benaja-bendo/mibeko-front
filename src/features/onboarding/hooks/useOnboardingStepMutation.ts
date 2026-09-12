/**
 * useOnboardingStepMutation.ts — Enregistre une vue, une réponse ou un
 * passage sur une étape (mibeko-dashboard#136). Met à jour le cache local
 * sans refetch complet : la réponse du serveur (`step` + `enrollment`) suffit.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClientId } from '@/shared/lib/clientId';
import { updateOnboardingStep } from '@/features/onboarding/api/onboardingApi';
import { onboardingKeys } from '@/features/onboarding/hooks/useOnboardingJourney';
import type { OnboardingJourneyResponse, OnboardingStepAction } from '@/features/onboarding/types';

interface StepMutationInput {
  stepKey: string;
  action: OnboardingStepAction;
  value?: unknown;
}

export function useOnboardingStepMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ stepKey, action, value }: StepMutationInput) =>
      updateOnboardingStep(stepKey, {
        action,
        value,
        client_mutation_id: generateClientId(),
        client_updated_at: Date.now(),
        platform: 'web',
      }),
    onSuccess: (result, variables) => {
      qc.setQueryData<OnboardingJourneyResponse>(onboardingKeys.journey('web'), (prev) => {
        if (!prev?.journey) return prev;
        return {
          ...prev,
          journey: {
            ...prev.journey,
            steps: prev.journey.steps.map((step) => {
              if (step.key !== variables.stepKey || !result.step) return step;
              const { viewed_at, skipped_at, completed_at, value } = result.step;
              return { ...step, progress: { viewed_at, skipped_at, completed_at, value } };
            }),
          },
          enrollment: result.enrollment,
        };
      });
    },
  });
}

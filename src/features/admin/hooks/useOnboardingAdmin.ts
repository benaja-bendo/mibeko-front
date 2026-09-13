import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveOnboardingJourney,
  createOnboardingDraft,
  listOnboardingJourneys,
  previewOnboarding,
  publishOnboardingDraft,
  rollbackOnboarding,
  updateOnboardingDraft,
  validateOnboarding,
  type AdminOnboardingStep,
} from '@/features/admin/api/onboardingAdminApi';
import type { OnboardingStepType } from '@/features/onboarding/types';

const key = ['admin', 'onboarding-journeys'] as const;

export function useOnboardingJourneys() {
  return useQuery({ queryKey: key, queryFn: listOnboardingJourneys, staleTime: 30_000 });
}

export function useOnboardingAdminMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const createDraft = useMutation({ mutationFn: createOnboardingDraft, onSuccess: refresh });
  const saveDraft = useMutation({
    mutationFn: ({ id, definition }: { id: string; definition: AdminOnboardingStep[] }) =>
      updateOnboardingDraft(id, definition),
    onSuccess: refresh,
  });
  const preview = useMutation({
    mutationFn: (payload: {
      definition: AdminOnboardingStep[];
      platform: 'web' | 'mobile';
      known_step_types?: OnboardingStepType[];
      answers?: Record<string, unknown>;
    }) => previewOnboarding(payload),
  });
  const validate = useMutation({ mutationFn: validateOnboarding });
  const publish = useMutation({ mutationFn: publishOnboardingDraft, onSuccess: refresh });
  const rollback = useMutation({ mutationFn: rollbackOnboarding, onSuccess: refresh });
  const archive = useMutation({ mutationFn: archiveOnboardingJourney, onSuccess: refresh });

  return { createDraft, saveDraft, validate, preview, publish, rollback, archive };
}

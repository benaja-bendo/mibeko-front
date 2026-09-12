/**
 * useOnboardingJourney.ts — État serveur du parcours d'onboarding (front#40).
 *
 * Seule source de vérité sur « qui voit l'accueil » : `enrollment.status`
 * renvoyé par le serveur. Aucune segmentation en localStorage — voir
 * `OnboardingHost`.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getOnboardingJourney } from '@/features/onboarding/api/onboardingApi';

export const onboardingKeys = {
  all: ['onboarding'] as const,
  journey: (platform: 'web' | 'mobile') => [...onboardingKeys.all, 'journey', platform] as const,
};

/** Parcours + progression du compte courant. `staleTime` court : l'état change à chaque mutation. */
export function useOnboardingJourney(options: { enabled?: boolean } = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: onboardingKeys.journey('web'),
    queryFn: () => getOnboardingJourney('web'),
    enabled: isAuthenticated && (options.enabled ?? true),
    staleTime: 15_000,
  });
}

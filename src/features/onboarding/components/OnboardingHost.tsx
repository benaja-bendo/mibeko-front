import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { isEditorOrAbove } from '@/shared/types/auth';
import { useOnboardingJourney } from '@/features/onboarding/hooks/useOnboardingJourney';
import { useOnboardingStepMutation } from '@/features/onboarding/hooks/useOnboardingStepMutation';
import { useOnboardingPostpone } from '@/features/onboarding/hooks/useOnboardingPostpone';
import { useOnboardingReplay } from '@/features/onboarding/hooks/useOnboardingReplay';
import { OnboardingModal } from '@/features/onboarding/components/OnboardingModal';
import { OnboardingChecklist } from '@/features/onboarding/components/OnboardingChecklist';

/**
 * Orchestrateur de l'accueil d'onboarding (front#40) — monté une fois dans
 * `AppLayout`, donc visible sur toutes les pages qui l'utilisent (`/app/*`
 * ET `/settings/*` pour un compte non-staff, `AppLayout` étant partagé) —
 * d'où le filtre explicite sur le chemin : seules les pages `/app/*` sont
 * concernées, jamais `/settings/*` (qui accueille justement le lien
 * « Modifier mes préférences », un aller simple, pas une boucle).
 *
 * Seule source de vérité sur qui voit l'accueil : `enrollment.status` renvoyé
 * par le serveur. Aucune segmentation en localStorage. En cas d'indisponibilité
 * (réseau, `available:false`) : ne rend rien, le produit reste accessible
 * normalement, reprise silencieuse au prochain chargement.
 */
export function OnboardingHost() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const eligible = pathname.startsWith('/app') && !isEditorOrAbove(user);

  const { data, isError } = useOnboardingJourney({ enabled: eligible });
  const stepMutation = useOnboardingStepMutation();
  const postpone = useOnboardingPostpone();
  const replay = useOnboardingReplay();

  const [forceOpen, setForceOpen] = useState(false);
  const [mode, setMode] = useState<'resume' | 'review'>('resume');
  const [focusStepKey, setFocusStepKey] = useState<string | null>(null);
  const autoSkipped = useRef<Set<string>>(new Set());

  const status = data?.enrollment?.status;
  const journey = data?.journey;

  // Étape d'un type inconnu de ce client (`supported:false`) : auto-passée,
  // sans rien afficher — sinon `maybeCompleteJourney()` côté serveur (qui ne
  // filtre pas par capacité client) bloquerait l'inscription indéfiniment.
  useEffect(() => {
    for (const step of journey?.steps ?? []) {
      const unresolved = step.progress.completed_at === null && step.progress.skipped_at === null;
      if (step.supported === false && unresolved && !autoSkipped.current.has(step.key)) {
        autoSkipped.current.add(step.key);
        stepMutation.mutate({ stepKey: step.key, action: 'skip' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey?.steps]);

  if (!eligible || isError || !data?.available || !journey || !status) return null;

  const modalOpen = status === 'not_started' || status === 'in_progress' || forceOpen;

  function handlePostpone() {
    setForceOpen(false);
    setMode('resume');
    setFocusStepKey(null);
    postpone.mutate();
  }

  return (
    <>
      <OnboardingModal
        open={modalOpen}
        journey={journey}
        mode={mode}
        focusStepKey={focusStepKey}
        pending={stepMutation.isPending}
        onAnswer={(stepKey, value) => stepMutation.mutate({ stepKey, action: 'answer', value })}
        onSkip={(stepKey) => stepMutation.mutate({ stepKey, action: 'skip' })}
        onPostpone={handlePostpone}
        onReviewFinished={() => {
          setMode('resume');
          setForceOpen(false);
          setFocusStepKey(null);
        }}
      />
      <OnboardingChecklist
        status={status}
        journey={journey}
        onHide={handlePostpone}
        onItemClick={(stepKey) => {
          setFocusStepKey(stepKey);
          setForceOpen(true);
        }}
        onReplay={() => replay.mutate(undefined, { onSuccess: () => setMode('review') })}
      />
    </>
  );
}

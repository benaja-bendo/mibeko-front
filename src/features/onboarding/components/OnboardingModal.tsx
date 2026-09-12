import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { WelcomeStep } from '@/features/onboarding/components/steps/WelcomeStep';
import { UsageContextStep } from '@/features/onboarding/components/steps/UsageContextStep';
import { InterestsStep } from '@/features/onboarding/components/steps/InterestsStep';
import { DiscoverSourcesStep } from '@/features/onboarding/components/steps/DiscoverSourcesStep';
import { onboardingCopy } from '@/features/onboarding/lib/onboardingCopy';
import type { OnboardingJourneyDefinition, OnboardingStepDefinition } from '@/features/onboarding/types';

interface OnboardingModalProps {
  open: boolean;
  journey: OnboardingJourneyDefinition;
  /** `review` : reparcourt TOUTES les étapes dans l'ordre (déclenché par « Revoir le guide », qui ne réinitialise aucune progression côté serveur — cf. `useOnboardingReplay`). `resume` : reprend sur la première étape non résolue. */
  mode: 'resume' | 'review';
  onAnswer: (stepKey: string, value: unknown) => void;
  onSkip: (stepKey: string) => void;
  onPostpone: () => void;
  onReviewFinished: () => void;
  pending: boolean;
  /** Reprise depuis la checklist sur une étape précise (mode `resume` uniquement) — retombe sur la première non résolue si la clé ne correspond plus à une étape à résoudre. */
  focusStepKey?: string | null;
}

function resolved(step: OnboardingStepDefinition): boolean {
  return step.progress.completed_at !== null || step.progress.skipped_at !== null;
}

/** Rendu d'une étape inconnue (clé future non couverte par un composant dédié) — jamais un écran vide ni un crash. */
function GenericStep({ step, onContinue }: { step: OnboardingStepDefinition; onContinue: () => void }) {
  const config = step.config as { title_key?: string };
  return (
    <div className="space-y-4">
      <DialogTitle>{onboardingCopy(config.title_key, 'Une nouveauté vous attend')}</DialogTitle>
      <DialogDescription>Cette étape sera bientôt disponible.</DialogDescription>
      <div className="flex justify-end">
        <Button type="button" variant="gold" onClick={onContinue}>
          Continuer
        </Button>
      </div>
    </div>
  );
}

export function OnboardingModal({
  open,
  journey,
  mode,
  onAnswer,
  onSkip,
  onPostpone,
  onReviewFinished,
  pending,
  focusStepKey,
}: OnboardingModalProps) {
  const supportedSteps = journey.steps.filter((s) => s.supported !== false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const reviewFinishedRef = useRef(false);

  useEffect(() => {
    if (mode === 'review') {
      setReviewIndex(0);
      reviewFinishedRef.current = false;
    }
  }, [mode]);

  const firstUnresolved = supportedSteps.find((s) => !resolved(s));
  const focused = focusStepKey ? supportedSteps.find((s) => s.key === focusStepKey && !resolved(s)) : undefined;
  const currentStep = mode === 'review' ? supportedSteps[reviewIndex] : (focused ?? firstUnresolved);

  useEffect(() => {
    if (mode === 'review' && !currentStep && !reviewFinishedRef.current) {
      reviewFinishedRef.current = true;
      onReviewFinished();
    }
  }, [mode, currentStep, onReviewFinished]);

  function advance() {
    if (mode === 'review') setReviewIndex((i) => i + 1);
  }

  // En mode `review`, toutes les étapes sont déjà résolues côté serveur (le
  // rejeu ne réinitialise aucune `onboarding_step_progress`) : soumettre à
  // nouveau une réponse dessus est un no-op silencieux CÔTÉ VALEUR
  // (`OnboardingStepWriter::isTerminal()`), mais recalcule quand même
  // `maybeCompleteJourney()`, qui voit alors les 4 étapes déjà résolues et
  // repasse l'inscription en `completed` immédiatement — refermant la modale
  // après le tout premier clic au lieu de laisser reparcourir le guide.
  // Correctif : en review, on n'appelle le serveur QUE pour la DERNIÈRE
  // étape (le choix « objectif », qui doit rester un vrai routage), le reste
  // n'est qu'une navigation locale à travers les réponses préremplies —
  // modifier une réponse antérieure passe par « Modifier mes préférences ».
  function isLastSupported(stepKey: string): boolean {
    return supportedSteps[supportedSteps.length - 1]?.key === stepKey;
  }

  function handleAnswer(stepKey: string, value: unknown) {
    if (mode !== 'review' || isLastSupported(stepKey)) onAnswer(stepKey, value);
    advance();
  }

  function handleSkip(stepKey: string) {
    if (mode !== 'review' || isLastSupported(stepKey)) onSkip(stepKey);
    advance();
  }

  return (
    <Dialog open={open && !!currentStep} onOpenChange={(next) => !next && onPostpone()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {currentStep?.type === 'welcome' && (
          <WelcomeStep step={currentStep} onContinue={() => handleAnswer(currentStep.key, undefined)} pending={pending} />
        )}
        {currentStep?.type === 'single_choice' && currentStep.key === 'usage_context' && (
          <UsageContextStep
            step={currentStep}
            onAnswer={(value) => handleAnswer(currentStep.key, value)}
            onSkip={() => handleSkip(currentStep.key)}
            pending={pending}
          />
        )}
        {currentStep?.type === 'multi_choice' && currentStep.key === 'interests' && (
          <InterestsStep
            step={currentStep}
            onAnswer={(value) => handleAnswer(currentStep.key, value)}
            onSkip={() => handleSkip(currentStep.key)}
            pending={pending}
          />
        )}
        {currentStep?.type === 'guided_action' && currentStep.key === 'discover_sources' && (
          <DiscoverSourcesStep step={currentStep} onAnswer={(value) => handleAnswer(currentStep.key, value)} />
        )}
        {currentStep &&
          !(
            (currentStep.type === 'welcome') ||
            (currentStep.type === 'single_choice' && currentStep.key === 'usage_context') ||
            (currentStep.type === 'multi_choice' && currentStep.key === 'interests') ||
            (currentStep.type === 'guided_action' && currentStep.key === 'discover_sources')
          ) && <GenericStep step={currentStep} onContinue={() => handleAnswer(currentStep.key, undefined)} />}
      </DialogContent>
    </Dialog>
  );
}

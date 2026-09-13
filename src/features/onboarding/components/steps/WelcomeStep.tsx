import { DialogDescription, DialogTitle } from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { onboardingCopy } from '@/features/onboarding/lib/onboardingCopy';
import { StepExamples } from '@/features/onboarding/components/StepExamples';
import type { OnboardingStepDefinition } from '@/features/onboarding/types';

interface WelcomeStepProps {
  step: OnboardingStepDefinition;
  onContinue: () => void;
  pending: boolean;
}

/** Écran d'accueil : la promesse du produit, aucun résultat juridique garanti. */
export function WelcomeStep({ step, onContinue, pending }: WelcomeStepProps) {
  const config = step.config as { title?: string; body?: string; cta?: string; title_key?: string; body_key?: string; examples?: string[] };

  return (
    <div className="space-y-4">
      <DialogTitle>{config.title ?? onboardingCopy(config.title_key, 'Bienvenue sur Mibeko')}</DialogTitle>
      <DialogDescription>
        {config.body ?? onboardingCopy(
          config.body_key,
          "Trouvez et comprenez les textes juridiques du Congo-Brazzaville et de l'OHADA.",
        )}
      </DialogDescription>
      <StepExamples examples={config.examples} />
      <div className="flex justify-end">
        <Button type="button" variant="gold" onClick={onContinue} disabled={pending}>
          {config.cta ?? 'Continuer'}
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { DialogDescription, DialogTitle } from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { usageContextLabel } from '@/shared/lib/labels';
import { StepExamples } from '@/features/onboarding/components/StepExamples';
import type { OnboardingChoiceOption, OnboardingStepDefinition } from '@/features/onboarding/types';

interface UsageContextStepProps {
  step: OnboardingStepDefinition;
  onAnswer: (value: string) => void;
  onSkip: () => void;
  pending: boolean;
}

/**
 * Question « cadre d'usage » — options fournies par le serveur (`config.options`)
 * mais libellées via `usageContextLabel` (source unique partagée avec les
 * Paramètres), pas via les `label_key` du serveur : ce sont les 4 mêmes codes
 * fermés des deux côtés, pas la peine de dupliquer une seconde traduction.
 */
export function UsageContextStep({ step, onAnswer, onSkip, pending }: UsageContextStepProps) {
  const config = step.config as { title?: string; body?: string; cta?: string; examples?: string[]; options?: OnboardingChoiceOption[] };
  const options = config.options ?? [];
  const [selected, setSelected] = useState<string | null>((step.progress.value as string) ?? null);

  return (
    <div className="space-y-4">
      <DialogTitle>{config.title ?? "Quel est votre cadre d'usage ?"}</DialogTitle>
      <DialogDescription>{config.body ?? 'Facultatif — vous pourrez le changer plus tard dans vos préférences.'}</DialogDescription>
      <StepExamples examples={config.examples} />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cadre d'usage">
        {options.map((option) => (
          <Button
            key={option.code}
            type="button"
            variant={selected === option.code ? 'gold' : 'outline'}
            role="radio"
            aria-checked={selected === option.code}
            onClick={() => setSelected(option.code)}
          >
            {option.label ?? usageContextLabel(option.code)}
          </Button>
        ))}
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onSkip} disabled={pending}>
          Passer
        </Button>
        <Button
          type="button"
          variant="gold"
          onClick={() => selected && onAnswer(selected)}
          disabled={!selected || pending}
        >
          {config.cta ?? 'Continuer'}
        </Button>
      </div>
    </div>
  );
}

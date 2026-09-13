import { useState } from 'react';
import { DialogDescription, DialogTitle } from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { useThemes } from '@/features/library/hooks/useThemes';
import { StepExamples } from '@/features/onboarding/components/StepExamples';
import type { OnboardingStepDefinition } from '@/features/onboarding/types';

interface InterestsStepProps {
  step: OnboardingStepDefinition;
  onAnswer: (value: string[]) => void;
  onSkip: () => void;
  pending: boolean;
}

/**
 * Question secondaire (« deux questions PRINCIPALES » du ticket ne l'incluent
 * pas) — très escamotable, chargée via `useThemes()` déjà existant
 * (`GET library/themes`, aussi consommé par `IdentityCard`) plutôt qu'un
 * second appel dupliqué.
 */
export function InterestsStep({ step, onAnswer, onSkip, pending }: InterestsStepProps) {
  const config = step.config as { title?: string; body?: string; cta?: string; examples?: string[] };
  const themes = useThemes();
  const [selected, setSelected] = useState<string[]>((step.progress.value as string[]) ?? []);

  function toggle(slug: string) {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  return (
    <div className="space-y-4">
      <DialogTitle>{config.title ?? "Des centres d'intérêt à signaler ?"}</DialogTitle>
      <DialogDescription>{config.body ?? 'Facultatif — utile pour mettre en avant les bons textes plus tard.'}</DialogDescription>
      <StepExamples examples={config.examples} />
      <div className="flex flex-wrap gap-2">
        {themes.data?.map((theme) => (
          <Button
            key={theme.slug}
            type="button"
            size="sm"
            variant={selected.includes(theme.slug) ? 'gold' : 'outline'}
            onClick={() => toggle(theme.slug)}
            aria-pressed={selected.includes(theme.slug)}
          >
            {theme.name}
          </Button>
        ))}
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onSkip} disabled={pending}>
          Passer
        </Button>
        <Button type="button" variant="gold" onClick={() => onAnswer(selected)} disabled={pending}>
          {config.cta ?? 'Continuer'}
        </Button>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { DialogDescription, DialogTitle } from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { onboardingCopy } from '@/features/onboarding/lib/onboardingCopy';
import { StepExamples } from '@/features/onboarding/components/StepExamples';
import type { OnboardingStepDefinition } from '@/features/onboarding/types';

interface DiscoverSourcesStepProps {
  step: OnboardingStepDefinition;
  onAnswer: (value: 'comprendre' | 'retrouver' | 'explorer') => void;
}

/**
 * Réinterprétation front de l'étape serveur `discover_sources` (`guided_action`,
 * `binding: null`) comme le choix « objectif » du ticket front#40 — validée
 * sans risque : `OnboardingAnswerValidator::validate()` ne contraint `value`
 * que pour `single_choice`/`multi_choice`/`optional_field`, pas `guided_action`.
 *
 * Chaque choix navigue directement — jamais de `?q=` pré-rempli sur l'Assistant
 * (qui enverrait la question SANS confirmation, cf. Assistant.tsx) : atterrir
 * sur `AssistantHomeView` (déjà pourvu d'exemples cliquables) ou sur la
 * Bibliothèque suffit à orienter sans consommer un appel IA pour afficher
 * l'accueil.
 */
export function DiscoverSourcesStep({ step, onAnswer }: DiscoverSourcesStepProps) {
  const navigate = useNavigate();
  const config = step.config as { title?: string; body?: string; title_key?: string; examples?: string[]; options?: Array<{ code: string; label?: string }> };
  const labels = new Map(config.options?.map((option) => [option.code, option.label]));

  function choose(value: 'comprendre' | 'retrouver' | 'explorer', destination: string) {
    onAnswer(value);
    navigate(destination);
  }

  return (
    <div className="space-y-4">
      <DialogTitle>{config.title ?? onboardingCopy(config.title_key, "Que voulez-vous faire aujourd'hui ?")}</DialogTitle>
      <DialogDescription>{config.body ?? 'Vous pourrez toujours revenir à cet accueil plus tard.'}</DialogDescription>
      <StepExamples examples={config.examples} />
      <div className="grid gap-2">
        <Button type="button" variant="outline" className="justify-start" onClick={() => choose('comprendre', '/app/assistant')}>
          {labels.get('comprendre') ?? "Comprendre une question — poser une question à l'Assistant"}
        </Button>
        <Button type="button" variant="outline" className="justify-start" onClick={() => choose('retrouver', '/app/library')}>
          {labels.get('retrouver') ?? 'Retrouver un texte — chercher dans la bibliothèque'}
        </Button>
        <Button type="button" variant="outline" className="justify-start" onClick={() => choose('explorer', '/app/library')}>
          {labels.get('explorer') ?? 'Explorer — parcourir par thème'}
        </Button>
      </div>
    </div>
  );
}

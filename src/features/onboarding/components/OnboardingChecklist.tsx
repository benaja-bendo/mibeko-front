import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { OnboardingEnrollmentStatus, OnboardingJourneyDefinition } from '@/features/onboarding/types';

interface OnboardingChecklistProps {
  status: OnboardingEnrollmentStatus;
  journey: OnboardingJourneyDefinition;
  onItemClick: (stepKey: string) => void;
  onHide: () => void;
  onReplay: () => void;
}

const STEP_LABELS: Record<string, string> = {
  usage_context: "Cadre d'usage",
  interests: "Centres d'intérêt",
  discover_sources: 'Premier pas',
};

/**
 * Widget discret de reprise — vit dans le coin de l'app (montée par
 * `OnboardingHost` dans `AppLayout`, donc visible sur toutes les pages
 * `/app/*`). Deux visages distincts, jamais mélangés :
 *  - `in_progress` : la checklist (items dérivés de `journey.steps`, cochés
 *    via `completed_at||skipped_at` — aucun état inventé côté client) ;
 *  - `completed` : « Revoir le guide » (rejeu volontaire, cf.
 *    `useOnboardingReplay`) distinct de « Modifier mes préférences » (lien
 *    direct vers les Paramètres, qui éditent déjà ces mêmes champs).
 * Le masquage appelle la MÊME mutation `postpone` que la fermeture de la
 * modale — pas de flag local qui déciderait seul de sa réapparition.
 */
export function OnboardingChecklist({ status, journey, onItemClick, onHide, onReplay }: OnboardingChecklistProps) {
  if (status === 'completed') {
    return (
      <div className="fixed bottom-4 right-4 z-[500] flex items-center gap-2 rounded-xl border border-b2 bg-s1 px-3 py-2 text-sm shadow-lg">
        <button type="button" className="text-gold hover:underline" onClick={onReplay}>
          Revoir le guide
        </button>
        <span className="text-t3" aria-hidden="true">·</span>
        <Link to="/settings/account" className="text-t2 hover:underline">
          Modifier mes préférences
        </Link>
      </div>
    );
  }

  if (status !== 'in_progress') return null;

  const items = journey.steps.filter((s) => s.key !== 'welcome' && s.supported !== false);
  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[500] w-64 rounded-xl border border-b2 bg-s1 p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-t1">Prise en main</span>
        <button type="button" onClick={onHide} aria-label="Masquer" className="text-t3 hover:text-t1">
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="space-y-1.5">
        {items.map((step) => {
          const done = step.progress.completed_at !== null || step.progress.skipped_at !== null;
          return (
            <li key={step.key}>
              <button
                type="button"
                onClick={() => onItemClick(step.key)}
                disabled={done}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm',
                  done ? 'text-t3' : 'text-t1 hover:bg-s2',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    done ? 'border-gold bg-gold/20' : 'border-b2',
                  )}
                >
                  {done && <Check className="h-3 w-3 text-gold" />}
                </span>
                <span className={done ? 'line-through' : ''}>{STEP_LABELS[step.key] ?? step.key}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

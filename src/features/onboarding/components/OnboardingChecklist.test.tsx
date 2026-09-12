import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { OnboardingChecklist } from './OnboardingChecklist';
import type { OnboardingJourneyDefinition, OnboardingStepDefinition } from '@/features/onboarding/types';

function step(overrides: Partial<OnboardingStepDefinition>): OnboardingStepDefinition {
  return {
    key: 'usage_context',
    type: 'single_choice',
    scope: 'common',
    binding: 'profile.usage_context',
    config: {},
    conditions: [],
    supported: true,
    progress: { viewed_at: null, skipped_at: null, completed_at: null, value: null },
    ...overrides,
  };
}

const JOURNEY: OnboardingJourneyDefinition = {
  key: 'onboarding',
  version: 1,
  steps: [
    step({ key: 'welcome', type: 'welcome', binding: null, progress: { viewed_at: null, skipped_at: null, completed_at: '2026-01-01T00:00:00+00:00', value: null } }),
    step({ key: 'usage_context', progress: { viewed_at: null, skipped_at: null, completed_at: '2026-01-01T00:00:00+00:00', value: 'personal' } }),
    step({ key: 'interests', type: 'multi_choice', binding: 'profile.interests' }),
  ],
};

describe('OnboardingChecklist', () => {
  it("n'affiche rien avant que le parcours ait commencé", () => {
    renderWithProviders(
      <OnboardingChecklist status="not_started" journey={JOURNEY} onItemClick={vi.fn()} onHide={vi.fn()} onReplay={vi.fn()} />,
    );
    expect(screen.queryByText('Prise en main')).not.toBeInTheDocument();
  });

  it('coche les items résolus, laisse les autres actionnables', () => {
    renderWithProviders(
      <OnboardingChecklist status="in_progress" journey={JOURNEY} onItemClick={vi.fn()} onHide={vi.fn()} onReplay={vi.fn()} />,
    );
    expect(screen.getByText("Cadre d'usage")).toBeInTheDocument();
    // "welcome" n'est jamais un item de checklist.
    expect(screen.queryByText('Bienvenue')).not.toBeInTheDocument();
    const usageItem = screen.getByRole('button', { name: /Cadre d'usage/ });
    expect(usageItem).toBeDisabled();
    const interestsItem = screen.getByRole('button', { name: /Centres d'intérêt/ });
    expect(interestsItem).not.toBeDisabled();
  });

  it('le masquage appelle onHide (même mutation postpone que la fermeture de la modale)', async () => {
    const user = userEvent.setup();
    const onHide = vi.fn();
    renderWithProviders(
      <OnboardingChecklist status="in_progress" journey={JOURNEY} onItemClick={vi.fn()} onHide={onHide} onReplay={vi.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: 'Masquer' }));
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('un clic sur un item non résolu déclenche la reprise sur cette étape', async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    renderWithProviders(
      <OnboardingChecklist status="in_progress" journey={JOURNEY} onItemClick={onItemClick} onHide={vi.fn()} onReplay={vi.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: /Centres d'intérêt/ }));
    expect(onItemClick).toHaveBeenCalledWith('interests');
  });

  it('affiche « Revoir le guide » distinct de « Modifier mes préférences » une fois terminé', () => {
    renderWithProviders(
      <OnboardingChecklist status="completed" journey={JOURNEY} onItemClick={vi.fn()} onHide={vi.fn()} onReplay={vi.fn()} />,
    );
    expect(screen.getByText('Revoir le guide')).toBeInTheDocument();
    expect(screen.getByText('Modifier mes préférences')).toBeInTheDocument();
    expect(screen.queryByText('Prise en main')).not.toBeInTheDocument();
  });

  it('« Revoir le guide » appelle onReplay', async () => {
    const user = userEvent.setup();
    const onReplay = vi.fn();
    renderWithProviders(
      <OnboardingChecklist status="completed" journey={JOURNEY} onItemClick={vi.fn()} onHide={vi.fn()} onReplay={onReplay} />,
    );
    await user.click(screen.getByText('Revoir le guide'));
    expect(onReplay).toHaveBeenCalledTimes(1);
  });
});

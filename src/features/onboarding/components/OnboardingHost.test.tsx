import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/features/auth/store/authStore';
import { OnboardingHost } from './OnboardingHost';
import type { OnboardingJourneyResponse, OnboardingStepDefinition } from '@/features/onboarding/types';

const PRO_USER = { id: 'u1', name: 'Compte Test', email: 'compte@test.cg', roles: ['user_pro' as const], permissions: [] };
const EDITOR_USER = { id: 'u2', name: 'Éditeur Test', email: 'editeur@test.cg', roles: ['editor' as const], permissions: [] };

function step(overrides: Partial<OnboardingStepDefinition>): OnboardingStepDefinition {
  return {
    key: 'welcome',
    type: 'welcome',
    scope: 'common',
    binding: null,
    config: { title_key: 'onboarding.welcome.title', body_key: 'onboarding.welcome.body' },
    conditions: [],
    supported: true,
    progress: { viewed_at: null, skipped_at: null, completed_at: null, value: null },
    ...overrides,
  };
}

const DISCOVER_SOURCES_STEP = step({
  key: 'discover_sources',
  type: 'guided_action',
  binding: null,
  config: { title_key: 'onboarding.discover_sources.title', cta_key: 'onboarding.discover_sources.cta' },
});

function journeyResponse(overrides: Partial<OnboardingJourneyResponse> = {}): OnboardingJourneyResponse {
  return {
    available: true,
    journey: { key: 'onboarding', version: 1, steps: [step({})] },
    enrollment: { status: 'not_started', started_at: null, completed_at: null, postponed_at: null, replay_count: 0 },
    ...overrides,
  };
}

function mockJourney(response: OnboardingJourneyResponse) {
  server.use(
    http.get('*/api/v1/onboarding/journey', () =>
      HttpResponse.json({ success: true, message: '', data: response }),
    ),
  );
}

beforeEach(() => {
  useAuthStore.getState().setAuth(PRO_USER, 'token-test');
});

afterEach(() => {
  useAuthStore.getState().clearAuth();
});

describe('OnboardingHost — reprise', () => {
  it('ouvre la modale sur welcome pour un nouvel inscrit sans intention', async () => {
    mockJourney(journeyResponse());
    renderWithProviders(<OnboardingHost />, { route: '/app/library' });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Bienvenue sur Mibeko')).toBeInTheDocument();
  });

  it('affiche les contenus littéraux publiés sans rebuild du client web', async () => {
    mockJourney(journeyResponse({
      journey: {
        key: 'onboarding',
        version: 2,
        steps: [step({ config: { title: 'Bienvenue aux professionnels', body: 'Un guide actualisé depuis l’administration.', cta: 'Découvrir', examples: ['Retrouver un texte OHADA'] } })],
      },
    }));

    renderWithProviders(<OnboardingHost />, { route: '/app/library' });

    expect(await screen.findByText('Bienvenue aux professionnels')).toBeInTheDocument();
    expect(screen.getByText('Un guide actualisé depuis l’administration.')).toBeInTheDocument();
    expect(screen.getByText('Exemple : Retrouver un texte OHADA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Découvrir' })).toBeInTheDocument();
  });

  it("ne rouvre pas la modale automatiquement quand le parcours est reporté", async () => {
    mockJourney(journeyResponse({ enrollment: { status: 'postponed', started_at: '2026-01-01T00:00:00+00:00', completed_at: null, postponed_at: '2026-01-01T00:05:00+00:00', replay_count: 0 } }));
    renderWithProviders(<OnboardingHost />, { route: '/app/library' });

    await waitFor(() => expect(screen.queryByText('Bienvenue sur Mibeko')).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ne rouvre pas la modale automatiquement pour un compte déjà terminé', async () => {
    mockJourney(journeyResponse({ enrollment: { status: 'completed', started_at: '2026-01-01T00:00:00+00:00', completed_at: '2026-01-01T00:10:00+00:00', postponed_at: null, replay_count: 0 } }));
    renderWithProviders(<OnboardingHost />, { route: '/app/library' });

    // Le widget « Revoir le guide » apparaît (compte terminé), jamais la modale.
    expect(await screen.findByText('Revoir le guide')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('OnboardingHost — next=assistant', () => {
  it("un inscrit via next=assistant atteint l'Assistant sans détour obligatoire (page accessible derrière la modale)", async () => {
    // `OnboardingHost` est monté comme frère de `children` dans `AppLayout`
    // (jamais un wrapper qui engloberait/bloquerait la page) — reproduit ici
    // sans importer le widget (une feature ne dépend pas de `widgets`, FSD).
    mockJourney(journeyResponse());
    renderWithProviders(
      <>
        <main>Contenu de la page Assistant</main>
        <OnboardingHost />
      </>,
      { route: '/app/assistant' },
    );

    // La modale d'onboarding se superpose...
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    // ...mais la page Assistant est déjà rendue derrière, pas un détour bloquant.
    expect(screen.getByText('Contenu de la page Assistant')).toBeInTheDocument();
  });
});

describe('OnboardingHost — disponibilité', () => {
  it("ne rend rien quand aucun parcours n'est actif (available:false)", async () => {
    mockJourney(journeyResponse({ available: false, journey: null, enrollment: null }));
    renderWithProviders(<OnboardingHost />, { route: '/app/library' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Revoir le guide')).not.toBeInTheDocument();
  });

  it("ne rend rien et ne bloque pas le produit en cas d'erreur réseau", async () => {
    server.use(http.get('*/api/v1/onboarding/journey', () => HttpResponse.json({ message: 'Indisponible' }, { status: 500 })));
    renderWithProviders(<OnboardingHost />, { route: '/app/library' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('ne se déclenche pas hors des pages /app/* (ex. /settings)', async () => {
    mockJourney(journeyResponse());
    renderWithProviders(<OnboardingHost />, { route: '/settings/account' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('ne se déclenche pas pour un compte éditeur/admin même sur /app', async () => {
    useAuthStore.getState().setAuth(EDITOR_USER, 'token-test');
    mockJourney(journeyResponse());
    renderWithProviders(<OnboardingHost />, { route: '/app/library' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('OnboardingHost — étape non supportée', () => {
  it('passe automatiquement une étape de type inconnu du client, sans rien afficher', async () => {
    let skipBody: unknown = null;
    mockJourney(
      journeyResponse({
        journey: { key: 'onboarding', version: 1, steps: [{ ...DISCOVER_SOURCES_STEP, supported: false }] },
      }),
    );
    server.use(
      http.patch('*/api/v1/onboarding/steps/:stepKey', async ({ request }) => {
        skipBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: {
            step: { key: 'discover_sources', viewed_at: null, skipped_at: '2026-01-01T00:00:00+00:00', completed_at: null, value: null },
            enrollment: { status: 'in_progress', started_at: '2026-01-01T00:00:00+00:00', completed_at: null, postponed_at: null, replay_count: 0 },
          },
        });
      }),
    );

    renderWithProviders(<OnboardingHost />, { route: '/app/library' });

    await waitFor(() => expect(skipBody).toMatchObject({ action: 'skip' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('OnboardingHost — fermeture', () => {
  it('reporte le parcours quand la modale est fermée (Échap)', async () => {
    const user = userEvent.setup();
    let postponeCalled = false;
    mockJourney(journeyResponse());
    server.use(
      http.post('*/api/v1/onboarding/postpone', () => {
        postponeCalled = true;
        return HttpResponse.json({
          success: true,
          data: { enrollment: { status: 'postponed', started_at: null, completed_at: null, postponed_at: '2026-01-01T00:00:00+00:00', replay_count: 0 } },
        });
      }),
    );

    renderWithProviders(<OnboardingHost />, { route: '/app/library' });
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(postponeCalled).toBe(true));
  });
});

describe('OnboardingHost — objectif (discover_sources)', () => {
  it("envoie le choix « comprendre » et ne pré-remplit jamais l'Assistant", async () => {
    const user = userEvent.setup();
    let answerBody: unknown = null;
    mockJourney(
      journeyResponse({
        journey: { key: 'onboarding', version: 1, steps: [DISCOVER_SOURCES_STEP] },
        enrollment: { status: 'in_progress', started_at: '2026-01-01T00:00:00+00:00', completed_at: null, postponed_at: null, replay_count: 0 },
      }),
    );
    server.use(
      http.patch('*/api/v1/onboarding/steps/discover_sources', async ({ request }) => {
        answerBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: {
            step: { key: 'discover_sources', viewed_at: null, skipped_at: null, completed_at: '2026-01-01T00:00:00+00:00', value: 'comprendre' },
            enrollment: { status: 'completed', started_at: '2026-01-01T00:00:00+00:00', completed_at: '2026-01-01T00:00:00+00:00', postponed_at: null, replay_count: 0 },
          },
        });
      }),
    );

    renderWithProviders(<OnboardingHost />, { route: '/app/library' });
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /Comprendre une question/ }));

    await waitFor(() => expect(answerBody).toMatchObject({ action: 'answer', value: 'comprendre' }));
  });
});

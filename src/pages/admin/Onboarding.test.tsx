import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { AdminOnboardingJourney, AdminOnboardingStep } from '@/features/admin/api/onboardingAdminApi';
import OnboardingAdminPage from './Onboarding';

const ADMIN = { id: 'admin-1', name: 'Admin', email: 'admin@mibeko.fr', roles: ['admin' as const], permissions: [] };
const DEFINITION: AdminOnboardingStep[] = [
  { key: 'welcome', type: 'welcome', scope: 'common', binding: null, config: { title: 'Bienvenue', body: 'Découvrez Mibeko.' }, conditions: [] },
  { key: 'usage_context', type: 'single_choice', scope: 'common', binding: 'profile.usage_context', config: { title: 'Votre usage', options: [{ code: 'personal', label: 'Personnel' }] }, conditions: [] },
];

function journey(patch: Partial<AdminOnboardingJourney>): AdminOnboardingJourney {
  return {
    id: 'journey-1', key: 'onboarding', version: 1, status: 'published', is_active: true,
    definition: DEFINITION, steps_count: 2, enrollments_count: 3, published_at: '2026-09-13T07:51:19Z',
    created_at: '2026-09-13T07:51:19Z', updated_at: '2026-09-13T07:51:19Z', is_editable: false,
    targeting: { new_accounts_only: true, existing_enrollments_keep_version: true }, ...patch,
  };
}

function mockJourneys(items: AdminOnboardingJourney[]) {
  server.use(http.get('*/api/v1/admin/onboarding-journeys', () => HttpResponse.json({ success: true, data: items })));
}

beforeEach(() => {
  useAuthStore.setState({ token: 'token', user: ADMIN, isInitialized: true });
});

it('crée un brouillon depuis la version active', async () => {
  const user = userEvent.setup();
  mockJourneys([journey({})]);
  let created = false;
  server.use(http.post('*/api/v1/admin/onboarding-journeys/drafts', () => {
    created = true;
    return HttpResponse.json({ success: true, data: journey({ id: 'draft-2', version: 2, status: 'draft', is_active: false, is_editable: true, enrollments_count: 0 }) }, { status: 201 });
  }));

  renderWithProviders(<OnboardingAdminPage />);
  await user.click(await screen.findByRole('button', { name: /Créer le brouillon/ }));
  expect(created).toBe(true);
});

it('modifie, réordonne et enregistre une définition structurée', async () => {
  const user = userEvent.setup();
  const draft = journey({ id: 'draft-2', version: 2, status: 'draft', is_active: false, is_editable: true, enrollments_count: 0 });
  mockJourneys([draft, journey({})]);
  let saved: AdminOnboardingStep[] | null = null;
  server.use(http.patch('*/api/v1/admin/onboarding-journeys/draft-2', async ({ request }) => {
    saved = ((await request.json()) as { definition: AdminOnboardingStep[] }).definition;
    return HttpResponse.json({ success: true, data: { ...draft, definition: saved } });
  }));

  renderWithProviders(<OnboardingAdminPage />);
  const titles = await screen.findAllByText('Titre');
  expect(titles).toHaveLength(2);
  const titleInputs = screen.getAllByDisplayValue(/Bienvenue|Votre usage/);
  await user.clear(titleInputs[0]);
  await user.type(titleInputs[0], 'Bienvenue aux juristes');
  await user.click(screen.getAllByRole('button', { name: 'Descendre l’étape' })[0]);
  await user.click(screen.getByRole('button', { name: /Enregistrer/ }));

  await waitFor(() => expect(saved).not.toBeNull());
  const savedDefinition = saved as AdminOnboardingStep[] | null;
  expect(savedDefinition?.[0].key).toBe('usage_context');
  expect(savedDefinition?.[1].config.title).toBe('Bienvenue aux juristes');
});

it('prévisualise sans écriture puis exige une confirmation pour publier', async () => {
  const user = userEvent.setup();
  const draft = journey({ id: 'draft-2', version: 2, status: 'draft', is_active: false, is_editable: true, enrollments_count: 0 });
  mockJourneys([draft, journey({})]);
  let previewed = false;
  let published = false;
  server.use(
    http.post('*/api/v1/admin/onboarding-journeys/validate', () => HttpResponse.json({ success: true, data: { valid: true, steps_count: 2, platforms: ['web', 'mobile'] } })),
    http.post('*/api/v1/admin/onboarding-journeys/preview', () => {
      previewed = true;
      return HttpResponse.json({ success: true, data: { platform: 'web', steps: DEFINITION.map((step) => ({ ...step, supported: true })), writes_user_data: false, uses_ai: false } });
    }),
    http.post('*/api/v1/admin/onboarding-journeys/draft-2/publish', () => {
      published = true;
      return HttpResponse.json({ success: true, data: { ...draft, status: 'published', is_active: true } });
    }),
  );

  renderWithProviders(<OnboardingAdminPage />);
  expect(await screen.findByText(/Comparaison avec v1/)).toBeInTheDocument();
  expect(screen.getByText(/0 ajoutée\(s\), 0 retirée\(s\), 0 modifiée\(s\), 0 déplacée\(s\)/)).toBeInTheDocument();
  await user.click(await screen.findByRole('button', { name: /Prévisualiser sans écrire/ }));
  expect(await screen.findByRole('region', { name: 'Prévisualisation' })).toHaveTextContent('Aucune donnée utilisateur écrite');
  expect(previewed).toBe(true);

  const publishButton = screen.getByRole('button', { name: 'Publier la version' });
  expect(publishButton).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Valider' }));
  expect(await screen.findByText(/Définition valide : 2 étapes/)).toBeInTheDocument();
  expect(publishButton).toBeDisabled();
  await user.click(screen.getByLabelText(/Je confirme la population ciblée/));
  await waitFor(() => expect(publishButton).toBeEnabled());
  await user.click(publishButton);
  expect(published).toBe(true);
});

import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/render';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { AdminOverview } from '@/features/admin/api/adminApi';
import AdminDashboard from './AdminDashboard';

const ADMIN_USER = {
  id: 'u-admin',
  name: 'Administrateur',
  email: 'admin@mibeko.fr',
  roles: ['admin' as const],
  permissions: [],
};

/** Vue d'ensemble au repos : aucun compteur d'alerte, aucune variation. */
function overview(patch: Partial<AdminOverview> = {}): AdminOverview {
  return {
    content: { documents: 1208, articles: 22003, official_journals: 72 },
    referentiels: { document_types: 12, institutions: 30, tags: 18 },
    people: { users: 85 },
    attention: {
      open_flags: 0,
      open_flags_blocking: 0,
      open_flags_warning: 0,
      failed_extractions: 0,
      ai_errors_24h: 0,
      unhandled_contacts: 0,
      plan_grants_expiring_soon: 0,
    },
    trend_window_days: 7,
    trends: {
      new_users: { value: 4, previous: 2 },
      ai_questions: { value: 9, previous: 9 },
      ai_cost_fcfa: { value: 335, previous: 200 },
    },
    adoption: { mobile_active: 41, web_active: 4, total_active: 43, window_days: 30 },
    corpus: { published: 1083, pending: 125, versions_without_embedding: 1381 },
    ...patch,
  };
}

function mockOverview(data: AdminOverview) {
  server.use(http.get('*/api/v1/admin/overview', () => HttpResponse.json({ success: true, data })));
}

beforeEach(() => {
  useAuthStore.setState({ token: 'jeton-test', user: ADMIN_USER, isInitialized: true });
});

it('reste silencieux quand rien ne demande d\'action', async () => {
  mockOverview(overview());

  renderWithProviders(<AdminDashboard />);

  expect(await screen.findByText("Rien ne demande d'action.")).toBeInTheDocument();
});

it('énumère ce qui demande une action et lie les signalements bloquants', async () => {
  mockOverview(
    overview({
      attention: {
        open_flags: 5,
        open_flags_blocking: 4,
        open_flags_warning: 1,
        failed_extractions: 1,
        ai_errors_24h: 18,
        unhandled_contacts: 10,
        plan_grants_expiring_soon: 1,
      },
    }),
  );

  renderWithProviders(<AdminDashboard />);

  expect(await screen.findByText("18 erreurs de l'assistant IA sur 24 h")).toBeInTheDocument();
  expect(screen.getByText('10 messages de contact non traités')).toBeInTheDocument();
  // Singulier : une seule échéance, un seul abonnement.
  expect(screen.getByText('1 abonnement Pro expire sous 7 jours')).toBeInTheDocument();
  expect(screen.getByText('1 extraction en échec')).toBeInTheDocument();
  expect(screen.queryByText("Rien ne demande d'action.")).not.toBeInTheDocument();

  const blocking = screen.getByText('4 signalements bloquants').closest('a');
  expect(blocking).toHaveAttribute('href', '/admin/signalements');
});

it('colore la variation selon ce qu\'une hausse veut dire pour la métrique', async () => {
  mockOverview(overview());

  renderWithProviders(<AdminDashboard />);

  // Plus de comptes, c'est bon : hausse en vert.
  const comptes = await screen.findByText('+2 · +100 %');
  expect(comptes).toHaveClass('text-emerald-400');

  // Plus de coût, c'est mauvais : même sens de variation, couleur d'alerte.
  const cout = screen.getByText('+135 · +68 %');
  expect(cout).toHaveClass('text-amber-400');

  // Variation nulle : ni bonne ni mauvaise nouvelle.
  expect(screen.getByText('stable')).toBeInTheDocument();
});

it('affiche les comptes actifs par surface sans additionner un compte mixte', async () => {
  mockOverview(overview());

  renderWithProviders(<AdminDashboard />);

  // Portée à la section : « 4 » apparaît aussi dans les nouveaux comptes.
  // Le titre est rendu avant la réponse : c'est la valeur qu'il faut attendre.
  const section = (await screen.findByText(/Comptes actifs/)).closest('section');
  expect(section).not.toBeNull();

  const dansLaSection = within(section as HTMLElement);
  expect(await dansLaSection.findByText('41')).toBeInTheDocument();
  expect(dansLaSection.getByText('4')).toBeInTheDocument();
  // 43 et non 45 : le total vient du serveur, il n'est jamais recalculé ici.
  expect(dansLaSection.getByText('43')).toBeInTheDocument();
});

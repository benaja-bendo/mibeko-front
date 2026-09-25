import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import type { AdminUserDetail } from '@/features/admin/api/usersApi';
import UserDetailDrawer from './UserDetailDrawer';

const unverified: AdminUserDetail = {
  id: 'user-1',
  name: 'Awa Mbemba',
  email: 'awa@09gmail.com',
  email_verified: false,
  email_verified_at: null,
  email_verification_required: true,
  status: 'active',
  suspended_at: null,
  suspension_reason: null,
  is_online: false,
  last_seen_at: null,
  two_factor_enabled: false,
  active_tokens_count: 0,
  roles: ['mobile_user'],
  permissions_direct: [],
  permissions_effective: [],
  settings: null,
  ai_quota: { effective: { scope: 'day', limit: 5 }, override_limit: null, override_note: null },
  plan_grant: null,
  dossiers_count: 0,
  conversations_count: 0,
  subscription: null,
  recent_audits: [],
  created_at: '2026-09-22T10:00:00Z',
  deleted_at: null,
};

function serveUser(user: AdminUserDetail) {
  server.use(
    http.get('*/api/v1/admin/users/user-1', () => HttpResponse.json({ data: user })),
    // Section crédits hors sujet ici : laissée en chargement.
    http.get('*/api/v1/admin/users/user-1/credits', async () => {
      await delay('infinite');
    }),
  );
}

// mibeko-dashboard#203
it('renvoie le lien de vérification et annonce une mise en file, pas un envoi', async () => {
  serveUser(unverified);
  let resent = 0;
  server.use(
    http.post('*/api/v1/admin/users/user-1/verification-email', () => {
      resent += 1;
      return HttpResponse.json({ success: true, message: 'E-mail de vérification mis en file d\'envoi.', data: { remaining: 2 } }, { status: 202 });
    }),
  );
  renderWithProviders(<UserDetailDrawer userId="user-1" onClose={() => {}} />);

  expect(await screen.findByText('Non vérifié · bloqué')).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Renvoyer le lien' }));

  expect(await screen.findByText(/Lien de vérification mis en file d’envoi\. Encore 2 renvoi/)).toBeInTheDocument();
  expect(resent).toBe(1);
});

it('affiche le refus du serveur quand le quota de renvois est atteint', async () => {
  serveUser(unverified);
  server.use(
    http.post('*/api/v1/admin/users/user-1/verification-email', () =>
      HttpResponse.json({ success: false, message: 'Trop de renvois pour ce compte : réessayez dans 42 min.' }, { status: 429 }),
    ),
  );
  renderWithProviders(<UserDetailDrawer userId="user-1" onClose={() => {}} />);

  await userEvent.setup().click(await screen.findByRole('button', { name: 'Renvoyer le lien' }));

  expect(await screen.findByText('Trop de renvois pour ce compte : réessayez dans 42 min.')).toBeInTheDocument();
});

it('exige une confirmation avant de marquer l’adresse vérifiée sans e-mail', async () => {
  serveUser(unverified);
  let marked = 0;
  server.use(
    http.post('*/api/v1/admin/users/user-1/verify-email', () => {
      marked += 1;
      return HttpResponse.json({ success: true, message: 'Adresse email marquée comme vérifiée.', data: null });
    }),
  );
  renderWithProviders(<UserDetailDrawer userId="user-1" onClose={() => {}} />);
  const user = userEvent.setup();

  await user.click(await screen.findByRole('button', { name: 'Marquer vérifié' }));
  const dialog = await screen.findByRole('dialog', { name: 'Marquer l’adresse comme vérifiée ?' });
  expect(within(dialog).getByText(/awa@09gmail\.com/)).toBeInTheDocument();
  expect(marked).toBe(0);

  await user.click(within(dialog).getByRole('button', { name: 'Marquer comme vérifiée' }));
  await waitFor(() => expect(marked).toBe(1));
});

it('distingue un ancien compte non vérifié mais non bloqué, et ne renvoie rien à un compte suspendu', async () => {
  serveUser({ ...unverified, email_verification_required: false, status: 'suspended' });
  renderWithProviders(<UserDetailDrawer userId="user-1" onClose={() => {}} />);

  expect(await screen.findByText('Non vérifié · non requis')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Renvoyer le lien' })).not.toBeInTheDocument();
});

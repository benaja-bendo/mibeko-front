import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import Abonnements from './Abonnements';
import UserCreditsSection from '@/features/admin/components/UserCreditsSection';

const pagination = { current_page: 1, last_page: 1, total: 1 };

it('affiche les échéances, les écarts et le lien vers la fiche utilisateur', async () => {
  server.use(
    http.get('*/api/v1/admin/billing/summary', () => HttpResponse.json({
      data: {
        month: '2026-09', recorded_amount_fcfa: 15000, unpriced_grants: 1,
        collected_amount_fcfa: 15000, refunded_amount_fcfa: 0, corrections_amount_fcfa: 0, net_amount_fcfa: 15000, discrepancy_count: 0,
        expiring_7_days: 2, expiring_30_days: 3, untracked_pro_accounts: 1,
      },
    })),
    http.get('*/api/v1/admin/billing/grants', () => HttpResponse.json({ data: [], pagination })),
    http.get('*/api/v1/admin/billing/untracked', () => HttpResponse.json({ data: [{ id: 'user-1', name: 'Client à vérifier', email: 'client@example.cg' }], pagination })),
  );
  renderWithProviders(<Abonnements />, { route: '/admin/abonnements' });
  expect(await screen.findByText('Octrois expirant sous 30 jours')).toBeInTheDocument();
  expect(screen.getByText(/pas un rapprochement bancaire/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Pro à vérifier' }));
  expect(await screen.findByRole('link', { name: 'Client à vérifier' })).toHaveAttribute('href', '/admin/utilisateurs?focus=user-1');
});

it('affiche le brut, les remboursements, le net et les écarts dérivés du grand livre', async () => {
  server.use(
    http.get('*/api/v1/admin/billing/summary', () => HttpResponse.json({
      data: {
        month: '2026-09', recorded_amount_fcfa: 35000, unpriced_grants: 0,
        collected_amount_fcfa: 27000, refunded_amount_fcfa: 5000, corrections_amount_fcfa: 500, net_amount_fcfa: 22500, discrepancy_count: 1,
        expiring_7_days: 0, expiring_30_days: 0, untracked_pro_accounts: 0,
      },
    })),
    http.get('*/api/v1/admin/billing/grants', () => HttpResponse.json({ data: [], pagination })),
  );
  renderWithProviders(<Abonnements />, { route: '/admin/abonnements' });
  expect(await screen.findByText('27 000 FCFA')).toBeInTheDocument();
  expect(screen.getByText('5 000 FCFA')).toBeInTheDocument();
  expect(screen.getByText('22 500 FCFA')).toBeInTheDocument();
  expect(screen.getByText('Écarts saisi/encaissé').nextElementSibling).toHaveTextContent('1');
});

it('rembourse un octroi depuis son panneau de mouvements, sans couper l’accès par défaut', async () => {
  const grant = {
    id: 'grant-1', status: 'active', starts_at: '2026-09-01T00:00:00Z', ends_at: '2026-10-01T00:00:00Z', revoked_at: null,
    amount_fcfa: 15000, channel: 'mobile_money', reference: 'MM-001', created_at: '2026-09-01T00:00:00Z',
    user: { id: 'user-1', name: 'Client Pro', email: 'client@example.cg' }, creator: { name: 'Admin' },
  };
  let received: unknown;
  server.use(
    http.get('*/api/v1/admin/billing/summary', () => HttpResponse.json({
      data: { month: '2026-09', recorded_amount_fcfa: 0, unpriced_grants: 0, collected_amount_fcfa: 0, refunded_amount_fcfa: 0, corrections_amount_fcfa: 0, net_amount_fcfa: 0, discrepancy_count: 0, expiring_7_days: 0, expiring_30_days: 0, untracked_pro_accounts: 0 },
    })),
    http.get('*/api/v1/admin/billing/grants', () => HttpResponse.json({ data: [grant], pagination })),
    http.get('*/api/v1/admin/billing/grants/grant-1/movements', () => HttpResponse.json({ data: { collected_amount_fcfa: 15000, net_amount_fcfa: 15000, movements: [] } })),
    http.post('*/api/v1/admin/billing/grants/grant-1/movements', async ({ request }) => { received = await request.json(); return HttpResponse.json({ data: { id: 'mvt-1' } }); }),
  );
  renderWithProviders(<Abonnements />, { route: '/admin/abonnements' });
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Abonnements' }));
  await user.click(await screen.findByRole('button', { name: 'Mouvements' }));
  await user.click(await screen.findByRole('button', { name: 'Rembourser ou corriger' }));
  await user.type(screen.getByLabelText('Montant FCFA'), '-5000');
  await user.type(screen.getByLabelText('Motif obligatoire'), 'Paiement en double');
  await user.type(screen.getByLabelText('Référence unique de l’opération'), 'RB-001');
  await user.click(screen.getByRole('checkbox', { name: /Je confirme/ }));
  await user.click(screen.getByRole('button', { name: 'Enregistrer le mouvement' }));
  expect(await screen.findByText('Mouvement enregistré.')).toBeInTheDocument();
  expect(received).toEqual({ type: 'refund', amount_fcfa: -5000, reason: 'Paiement en double', reference_id: 'RB-001', revoke_access: false });
});

it('crédite un utilisateur avec confirmation, motif et référence', async () => {
  let received: unknown;
  server.use(
    http.get('*/api/v1/admin/users/user-1/credits', () => HttpResponse.json({ data: { balance: 10, entries: { data: [], last_page: 1 } } })),
    http.post('*/api/v1/admin/users/user-1/credits', async ({ request }) => { received = await request.json(); return HttpResponse.json({ data: { id: 'entry-1' } }); }),
  );
  renderWithProviders(<UserCreditsSection userId="user-1" />);
  const user = userEvent.setup();
  expect(await screen.findByText('Crédits du compte : 10')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Créditer ou corriger' }));
  expect(screen.getByRole('button', { name: 'Enregistrer le mouvement' })).toBeDisabled();
  await user.type(screen.getByLabelText('Nombre de crédits'), '25');
  await user.type(screen.getByLabelText('Motif obligatoire'), 'Vente vérifiée');
  await user.type(screen.getByLabelText('Référence unique de l’opération'), 'MM-025');
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Enregistrer le mouvement' }));
  expect(await screen.findByText('Mouvement enregistré.')).toBeInTheDocument();
  expect(received).toEqual({ amount: 25, type: 'purchase', reason: 'Vente vérifiée', reference_id: 'MM-025' });
});

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
    http.get('*/api/v1/admin/billing/summary', () => HttpResponse.json({ data: { month: '2026-09', recorded_amount_fcfa: 15000, unpriced_grants: 1, expiring_7_days: 2, expiring_30_days: 3, untracked_pro_accounts: 1 } })),
    http.get('*/api/v1/admin/billing/grants', () => HttpResponse.json({ data: [], pagination })),
    http.get('*/api/v1/admin/billing/untracked', () => HttpResponse.json({ data: [{ id: 'user-1', name: 'Client à vérifier', email: 'client@example.cg' }], pagination })),
  );
  renderWithProviders(<Abonnements />, { route: '/admin/abonnements' });
  expect(await screen.findByText('Octrois expirant sous 30 jours')).toBeInTheDocument();
  expect(screen.getByText(/pas un rapprochement bancaire/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Pro à vérifier' }));
  expect(await screen.findByRole('link', { name: 'Client à vérifier' })).toHaveAttribute('href', '/admin/utilisateurs?focus=user-1');
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

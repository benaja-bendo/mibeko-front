import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import Billing from './Billing';
import Support from './Support';
import type { BillingOverview, ManualGrant } from '@/features/billing/types';

const grant: ManualGrant = { id: 'grant-1', status: 'active', starts_at: '2026-09-01T12:00:00Z', ends_at: '2026-10-01T12:00:00Z', amount_fcfa: 15000, channel: 'mobile_money', reference: 'MM-001', created_at: '2026-09-01T12:00:00Z' };
const overview: BillingOverview = {
  effective_plan: 'pro', manual_subscription: grant, credit_balance: 40,
  stripe_enabled: false, subscription: { status: 'none', plan_name: null, renews_at: null, trial_ends_at: null, on_grace_period: false },
  payment_method: null, invoices: [], plans: [], billing_info: { company: null, rccm: null, tax_id: null, address: null },
};
function mockBilling(data = overview) {
  server.use(
    http.get('*/api/v1/billing', () => HttpResponse.json({ data })),
    http.get('*/api/v1/billing/manual-grants', () => HttpResponse.json({ data: [grant], pagination: { current_page: 1, last_page: 1, total: 1 } })),
    http.get('*/api/v1/billing/credits', () => HttpResponse.json({ data: [], pagination: { current_page: 1, last_page: 1, total: 0 } })),
  );
}

it('confirme le Pro manuel et son historique sans proposer un deuxième achat', async () => {
  mockBilling();
  renderWithProviders(<Billing />);
  expect(await screen.findByText('Votre accès Mibeko : Pro')).toBeInTheDocument();
  expect(await screen.findByText('Référence : MM-001')).toBeInTheDocument();
  expect(screen.getByText(/Abonnement manuel confirmé du/)).toHaveTextContent('01/10/2026');
  expect(screen.getByText(/Il ne se renouvelle pas automatiquement/)).toBeInTheDocument();
  expect(screen.queryByText(/Vous n’avez pas d’abonnement actif/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Renouveler ou poser/ })).toHaveAttribute('href', '/settings/support?category=billing');
  expect(screen.getByText('Crédits : 40')).toBeInTheDocument();
});

it('distingue un accès offert et ne le présente pas comme un paiement', async () => {
  mockBilling({ ...overview, manual_subscription: null });
  renderWithProviders(<Billing />);
  expect(await screen.findByText(/Cet accès n’est pas une preuve de paiement/)).toBeInTheDocument();
});

it('affiche une erreur récupérable et la pagination des abonnements', async () => {
  mockBilling();
  let failed = true;
  server.use(http.get('*/api/v1/billing/manual-grants', ({ request }) => {
    if (failed) return HttpResponse.json({ message: 'Historique indisponible' }, { status: 500 });
    const second = new URL(request.url).searchParams.get('page') === '2';
    return HttpResponse.json({ data: [{ ...grant, reference: second ? 'MM-ANCIEN' : 'MM-001' }], pagination: { current_page: second ? 2 : 1, last_page: 2, total: 21 } });
  }));
  renderWithProviders(<Billing />);
  const user = userEvent.setup();
  expect(await screen.findByText('Historique indisponible')).toBeInTheDocument();
  failed = false;
  await user.click(screen.getByRole('button', { name: 'Réessayer les abonnements' }));
  await screen.findByText('Référence : MM-001');
  await user.click(screen.getAllByRole('button', { name: 'Suivant' })[0]);
  expect(await screen.findByText('Référence : MM-ANCIEN')).toBeInTheDocument();
});

it('oriente une question de paiement vers la facturation sans demander de secret', () => {
  renderWithProviders(<Support />, { route: '/settings/support?category=billing' });
  expect(screen.getByRole('link', { name: 'Écrire à la facturation' })).toHaveAttribute('href', expect.stringContaining('mailto:facturation@mibeko.fr'));
  expect(screen.getByText(/Ne transmettez aucun code PIN/)).toBeInTheDocument();
});

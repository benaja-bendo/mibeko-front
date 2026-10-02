import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { InvitationRef } from '@/features/admin/api/usersApi';
import Utilisateurs from './Utilisateurs';

const invitation = (id: string, status: InvitationRef['status']): InvitationRef => ({
  id,
  email: `${id}@mibeko.test`,
  roles: ['editor'],
  status,
  invited_by: 'Administrateur',
  expires_at: '2026-10-09T12:00:00Z',
  accepted_at: status === 'accepted' ? '2026-10-02T12:00:00Z' : null,
  created_at: '2026-10-01T12:00:00Z',
});

it('sépare les invitations en attente des invitations acceptées et expirées', async () => {
  useAuthStore.setState({
    token: 'jeton-test',
    user: { id: 'admin-1', name: 'Administrateur', email: 'admin@mibeko.test', roles: ['admin'], permissions: [] },
    isInitialized: true,
  });
  server.use(
    http.get('*/api/v1/admin/users/stats', () => HttpResponse.json({ data: {
      total: 1, online: 0, active: 1, suspended: 0, pending: 0, new_last_7_days: 0, new_last_30_days: 0,
    } })),
    http.get('*/api/v1/admin/users', () => HttpResponse.json({ data: [], pagination: { current_page: 1, last_page: 1, total: 0 } })),
    http.get('*/api/v1/admin/invitations', ({ request }) => {
      const status = new URL(request.url).searchParams.get('status');
      return HttpResponse.json({ data: status === 'history'
        ? [invitation('acceptee', 'accepted'), invitation('expiree', 'expired')]
        : [invitation('attente', 'pending')] });
    }),
  );

  renderWithProviders(<Utilisateurs />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Invitations' }));

  expect(await screen.findByText('attente@mibeko.test')).toBeInTheDocument();
  expect(screen.queryByText('acceptee@mibeko.test')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Afficher l’historique des invitations' }));
  expect(await screen.findByText('acceptee@mibeko.test')).toBeInTheDocument();
  expect(screen.getByText('expiree@mibeko.test')).toBeInTheDocument();
  const acceptedRow = screen.getByText('acceptee@mibeko.test').closest('tr');
  expect(acceptedRow).not.toBeNull();
  expect(within(acceptedRow!).queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument();
});

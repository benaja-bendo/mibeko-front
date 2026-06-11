import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import { useAuthStore } from '@/features/auth/store/authStore';
import Sidebar from './Sidebar';

const TEST_USER = {
  id: 'u1',
  name: 'Maître Test',
  email: 'maitre@test.cg',
  roles: ['user_pro' as const],
  permissions: [],
};

describe('Sidebar — déconnexion', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth(TEST_USER, 'token-test');
    server.use(
      http.post('*/api/v1/logout', () => HttpResponse.json({ success: true })),
    );
  });

  afterEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('demande confirmation avant de déconnecter, et Annuler conserve la session', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sidebar space="app" />, { route: '/app' });

    // Ouvre le menu utilisateur puis clique « Déconnexion ».
    await user.click(screen.getByText('Maître Test'));
    await user.click(await screen.findByText('Déconnexion'));

    // Un dialogue de confirmation apparaît — rien n'est encore déconnecté.
    expect(
      await screen.findByRole('heading', { name: /Se déconnecter/ }),
    ).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBe('token-test');

    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    await waitFor(() => {
      expect(screen.queryByText(/Votre session sur cet appareil/)).not.toBeInTheDocument();
    });
    expect(useAuthStore.getState().token).toBe('token-test');
  });

  it('déconnecte réellement après confirmation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sidebar space="app" />, { route: '/app' });

    await user.click(screen.getByText('Maître Test'));
    await user.click(await screen.findByText('Déconnexion'));
    await user.click(
      await screen.findByRole('button', { name: /Se déconnecter/ }),
    );

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBeNull();
    });
  });
});

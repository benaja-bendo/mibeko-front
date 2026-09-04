import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/render';
import { useAuthStore } from '@/features/auth/store/authStore';
import Sidebar from './Sidebar';

const TEST_USER = {
  id: 'u1',
  name: 'Maître Test',
  email: 'maitre@test.cg',
  roles: ['user_pro' as const],
  permissions: [],
};

/**
 * Le nombre restant est mis en évidence dans un `<span>` propre — le texte
 * complet de QuotaIndicator est donc réparti sur plusieurs éléments, ce que
 * `getByText` ne reconnaît pas avec une chaîne littérale. On matche
 * l'élément le plus bas dont le texte complet correspond.
 */
function findByFullText(text: string) {
  return screen.findByText((_, element) => {
    if (!element) return false;
    const ownMatches = element.textContent === text;
    const aChildMatches = Array.from(element.children).some(
      (child) => child.textContent === text,
    );
    return ownMatches && !aChildMatches;
  });
}

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

describe('Sidebar — indicateur de quota permanent (mibeko-front#8)', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth(TEST_USER, 'token-test');
  });

  afterEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('affiche le quota restant dans l\'espace Pro, lu depuis les entitlements', async () => {
    server.use(
      http.get('*/api/v1/me/entitlements', () =>
        HttpResponse.json({
          success: true,
          data: {
            plan: 'libre',
            features: { assistant: true, library: true, export: false },
            quotas: { assistant: { used: 3, limit: 50, resets_at: null } },
            credits: null,
          },
        }),
      ),
    );

    renderWithProviders(<Sidebar space="app" />, { route: '/app' });

    expect(await findByFullText('47 questions restantes')).toBeInTheDocument();
  });

  it('reste à zéro plutôt que négatif si le quota est dépassé', async () => {
    server.use(
      http.get('*/api/v1/me/entitlements', () =>
        HttpResponse.json({
          success: true,
          data: {
            plan: 'libre',
            features: { assistant: true, library: true, export: false },
            quotas: { assistant: { used: 52, limit: 50, resets_at: null } },
            credits: null,
          },
        }),
      ),
    );

    renderWithProviders(<Sidebar space="app" />, { route: '/app' });

    expect(await findByFullText('0 question restante')).toBeInTheDocument();
  });

  it('ne s\'affiche pas hors de l\'espace Pro (éditeur, admin)', async () => {
    server.use(
      http.get('*/api/v1/me/entitlements', () =>
        HttpResponse.json({
          success: true,
          data: {
            plan: 'libre',
            features: { assistant: true, library: true, export: false },
            quotas: { assistant: { used: 3, limit: 50, resets_at: null } },
            credits: null,
          },
        }),
      ),
    );

    renderWithProviders(<Sidebar space="editor" />, { route: '/editor' });

    // Laisse le temps à un éventuel appel entitlements de résoudre avant de
    // conclure à l'absence — l'indicateur ne doit jamais apparaître ici.
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    expect(screen.queryByText(/questions? restante/)).not.toBeInTheDocument();
  });
});

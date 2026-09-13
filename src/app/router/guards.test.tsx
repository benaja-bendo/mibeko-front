import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { renderWithProviders } from '@/test/render';
import type { User } from '@/shared/types/auth';
import { RequireAuth } from './guards';

const unverifiedUser: User = {
  id: 'u1',
  name: 'Awa',
  email: 'awa@exemple.com',
  email_verified_at: null,
  email_verification_required: true,
  roles: ['mobile_user'],
  permissions: [],
};

describe('RequireAuth — vérification e-mail', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    useAuthStore.getState().setAuth(unverifiedUser, 'jeton-de-test');
  });

  it('redirige un compte soumis à vérification hors des routes produit', async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/app/library"
          element={<RequireAuth><div>Bibliothèque</div></RequireAuth>}
        />
        <Route path="/auth/verifier-email" element={<div>Vérification e-mail</div>} />
      </Routes>,
      { route: '/app/library' },
    );

    expect(await screen.findByText('Vérification e-mail')).toBeInTheDocument();
    expect(screen.queryByText('Bibliothèque')).not.toBeInTheDocument();
  });

  it('laisse ce compte atteindre la route de vérification elle-même', () => {
    renderWithProviders(
      <RequireAuth allowUnverifiedEmail>
        <div>Vérification e-mail</div>
      </RequireAuth>,
      { route: '/auth/verifier-email' },
    );

    expect(screen.getByText('Vérification e-mail')).toBeInTheDocument();
  });
});

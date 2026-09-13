import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { User } from '@/shared/types/auth';
import VerifyEmailPage from './VerifyEmailPage';

const unverifiedUser: User = {
  id: 'u1',
  name: 'Awa',
  email: 'awa@exemple.com',
  email_verified_at: null,
  email_verification_required: true,
  roles: ['mobile_user'],
  permissions: [],
};

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Route courante">{location.pathname}</output>;
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearAuth();
    useAuthStore.getState().setAuth(unverifiedUser, 'jeton-de-test');
  });

  it('affiche l’adresse et permet de renvoyer le lien', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/api/v1/email/verification-notification', () =>
        HttpResponse.json({
          success: true,
          message: 'Un nouvel e-mail vient de vous être envoyé.',
          data: null,
        }),
      ),
    );

    renderWithProviders(<VerifyEmailPage />, { route: '/auth/verifier-email' });

    expect(screen.getByText(/awa@exemple.com/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Renvoyer l’e-mail' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Un nouvel e-mail vient de vous être envoyé.');
  });

  it("ouvre l’Assistant après confirmation quand l’intention a été conservée", async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/api/v1/me', () =>
        HttpResponse.json({
          success: true,
          data: { user: { ...unverifiedUser, email_verified_at: '2026-09-13T10:00:00Z' } },
        }),
      ),
    );

    renderWithProviders(
      <>
        <VerifyEmailPage />
        <LocationProbe />
      </>,
      { route: '/auth/verifier-email?next=assistant' },
    );

    await user.click(screen.getByRole('button', { name: 'J’ai vérifié mon adresse' }));
    expect(await screen.findByRole('status', { name: 'Route courante' })).toHaveTextContent('/app/assistant');
  });

  it('reste sur place quand la confirmation n’est pas encore effective', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/api/v1/me', () =>
        HttpResponse.json({ success: true, data: { user: unverifiedUser } }),
      ),
    );

    renderWithProviders(<VerifyEmailPage />, { route: '/auth/verifier-email' });
    await user.click(screen.getByRole('button', { name: 'J’ai vérifié mon adresse' }));

    expect(await screen.findByRole('status')).toHaveTextContent('pas encore confirmée');
  });

  it("retrouve l’intention Assistant après un retour depuis le lien reçu par e-mail", async () => {
    const user = userEvent.setup();
    localStorage.setItem('mibeko:post-verification-next', 'assistant');
    server.use(
      http.get('*/api/v1/me', () =>
        HttpResponse.json({
          success: true,
          data: { user: { ...unverifiedUser, email_verified_at: '2026-09-13T10:00:00Z' } },
        }),
      ),
    );

    renderWithProviders(
      <>
        <VerifyEmailPage />
        <LocationProbe />
      </>,
      { route: '/auth/verifier-email' },
    );

    await user.click(screen.getByRole('button', { name: 'J’ai vérifié mon adresse' }));
    expect(await screen.findByRole('status', { name: 'Route courante' })).toHaveTextContent('/app/assistant');
    expect(localStorage.getItem('mibeko:post-verification-next')).toBeNull();
  });
});

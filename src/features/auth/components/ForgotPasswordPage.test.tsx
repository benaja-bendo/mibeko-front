import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import ForgotPasswordPage from './ForgotPasswordPage';

const ANTI_ENUMERATION =
  'Si un compte existe pour cette adresse, un code de réinitialisation a été envoyé.';

describe('ForgotPasswordPage', () => {
  it('affiche le même message que le compte existe ou non', async () => {
    // Le serveur répond volontairement à l'identique dans les deux cas : si
    // l'interface adaptait son texte, elle redeviendrait un outil
    // d'énumération d'adresses.
    const user = userEvent.setup();
    server.use(
      http.post('*/api/v1/forgot-password', () =>
        HttpResponse.json({ success: true, message: ANTI_ENUMERATION, data: null }),
      ),
    );

    renderWithProviders(<ForgotPasswordPage />, { route: '/auth/mot-de-passe-oublie' });
    await user.type(screen.getByPlaceholderText('vous@exemple.com'), 'inconnu@exemple.com');
    await user.click(screen.getByRole('button', { name: 'Recevoir un code' }));

    expect(await screen.findByRole('status')).toHaveTextContent(ANTI_ENUMERATION);
  });
});

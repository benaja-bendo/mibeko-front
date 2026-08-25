import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/render';
import ResetPasswordPage from './ResetPasswordPage';

describe('ResetPasswordPage', () => {
  it('n’accepte que six chiffres dans le champ code', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordPage />, { route: '/auth/reinitialiser' });

    const code = screen.getByPlaceholderText('123456');
    await user.type(code, 'ab12cd3456789');

    // Les lettres sont filtrées à la saisie et la longueur est bornée : le
    // serveur exige `digits:6`, autant ne pas laisser partir la requête.
    expect(code).toHaveValue('123456');
  });

  it('refuse deux mots de passe différents', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordPage />, { route: '/auth/reinitialiser' });

    await user.type(screen.getByPlaceholderText('vous@exemple.com'), 'awa@exemple.com');
    await user.type(screen.getByPlaceholderText('123456'), '123456');

    const [password, confirmation] = screen.getAllByPlaceholderText('••••••••');
    await user.type(password, 'motdepasse1');
    await user.type(confirmation, 'motdepasse2');

    await user.click(screen.getByRole('button', { name: 'Changer mon mot de passe' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Les deux mots de passe ne correspondent pas.',
    );
  });
});

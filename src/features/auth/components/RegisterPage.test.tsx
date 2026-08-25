import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/render';
import RegisterPage from './RegisterPage';

describe('RegisterPage', () => {
  it('refuse deux mots de passe différents sans appeler le serveur', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { route: '/auth/register' });

    await user.type(screen.getByPlaceholderText('Votre nom'), 'Awa');
    await user.type(screen.getByPlaceholderText('vous@exemple.com'), 'awa@exemple.com');

    const [password, confirmation] = screen.getAllByPlaceholderText('••••••••');
    await user.type(password, 'motdepasse1');
    await user.type(confirmation, 'motdepasse2');

    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Les deux mots de passe ne correspondent pas.',
    );
  });

  it('distingue les deux boutons de visibilité du mot de passe', async () => {
    renderWithProviders(<RegisterPage />, { route: '/auth/register' });

    // Deux champs de mot de passe coexistent : sans libellé distinct, les deux
    // boutons œil seraient indiscernables au clavier comme au lecteur d'écran.
    expect(screen.getByRole('button', { name: 'Afficher le mot de passe' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Afficher le mot de passe de confirmation' }),
    ).toBeInTheDocument();
  });
});

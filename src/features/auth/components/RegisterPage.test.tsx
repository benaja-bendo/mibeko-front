import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render';
import { useAuthStore } from '@/features/auth/store/authStore';
import RegisterPage from './RegisterPage';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Route courante">{location.pathname}</output>;
}

async function fillValidRegistrationForm() {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('Votre nom'), 'Awa');
  await user.type(screen.getByPlaceholderText('vous@exemple.com'), 'awa@exemple.com');

  const [password, confirmation] = screen.getAllByPlaceholderText('••••••••');
  await user.type(password, 'motdepasse1');
  await user.type(confirmation, 'motdepasse1');
  await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));
}

describe('RegisterPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    localStorage.clear();
  });

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

  it('annonce clairement ce que le compte gratuit ouvre', () => {
    renderWithProviders(<RegisterPage />, { route: '/auth/register' });

    expect(
      screen.getByText(
        /Un compte gratuit ouvre l’Assistant Mibeko et votre bibliothèque juridique/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/LegalTech/i)).not.toBeInTheDocument();
  });

  it("ouvre l'Assistant après une inscription qui porte cette intention", async () => {
    renderWithProviders(
      <>
        <RegisterPage />
        <LocationProbe />
      </>,
      { route: '/auth/register?next=assistant' },
    );

    await fillValidRegistrationForm();

    expect(
      await screen.findByRole('status', { name: 'Route courante' }),
    ).toHaveTextContent('/app/assistant');
  });

  it("conserve la bibliothèque comme destination d'inscription par défaut", async () => {
    renderWithProviders(
      <>
        <RegisterPage />
        <LocationProbe />
      </>,
      { route: '/auth/register' },
    );

    await fillValidRegistrationForm();

    expect(
      await screen.findByRole('status', { name: 'Route courante' }),
    ).toHaveTextContent('/app/library');
  });
});

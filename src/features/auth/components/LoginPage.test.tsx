import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/render';
import LoginPage from './LoginPage';

describe('LoginPage', () => {
  it('permet d\'afficher puis de masquer le mot de passe', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { route: '/auth/login' });

    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(
      screen.getByRole('button', { name: 'Afficher le mot de passe' }),
    );
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(
      screen.getByRole('button', { name: 'Masquer le mot de passe' }),
    );
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { IdentityCard } from './IdentityCard';
import type { AccountProfile, UpdateProfilePayload } from '@/features/settings/types';

const ACCOUNT: AccountProfile = {
  id: 'usr_1',
  name: 'Me Tshala',
  email: 'tshala@example.cg',
  email_verified: true,
  status: 'active',
  profile: {
    phone: '+242068000000',
    profession: 'Professionnel du droit',
    usage_context: 'professional',
    job_title: 'Avocat',
    company: 'Cabinet Mibeko',
    interests: ['famille'],
  },
  roles: ['user_pro'],
  permissions: ['library.read'],
  security: { two_factor_enabled: false, two_factor_confirmed: false },
  settings: {
    locale: 'fr',
    theme: 'lex-gold',
    timezone: 'Africa/Brazzaville',
    date_format: 'd/m/Y',
    notification_preferences: {
      extraction_update: { email: true, push: false, in_app: true },
      new_document: { email: true, push: false, in_app: true },
      share: { email: true, push: false, in_app: true },
      legal_alert: { email: true, push: false, in_app: true },
      billing: { email: true, push: false, in_app: true },
      system: { email: true, push: false, in_app: true },
      _frequency: 'instant',
    },
    consents: { marketing: false, marketing_at: null, analytics: false, analytics_at: null },
  },
  created_at: '2026-01-01T00:00:00+00:00',
};

const THEMES = [{ id: 'tag_1', name: 'Famille', slug: 'famille', icon: null, description: null, documents_count: 3 }];

function mockThemes() {
  server.use(http.get('*/api/v1/library/themes', () => HttpResponse.json({ success: true, data: THEMES })));
}

describe('IdentityCard', () => {
  it('reflète les informations du profil au rendu initial', async () => {
    mockThemes();
    renderWithProviders(<IdentityCard account={ACCOUNT} />);

    expect(screen.getByDisplayValue('Me Tshala')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+242068000000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Avocat')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cabinet Mibeko')).toBeInTheDocument();
    expect(within(screen.getByRole('combobox')).getByText('Activité professionnelle')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Famille', pressed: true })).toBeInTheDocument();
  });

  it('ne soumet que le champ modifié — payload diffé', async () => {
    mockThemes();
    const user = userEvent.setup();
    let receivedBody: UpdateProfilePayload | null = null;

    server.use(
      http.put('*/api/v1/profile', async ({ request }) => {
        receivedBody = (await request.json()) as UpdateProfilePayload;
        return HttpResponse.json({ success: true, data: { ...ACCOUNT, name: receivedBody.name } });
      }),
    );

    renderWithProviders(<IdentityCard account={ACCOUNT} />);
    await screen.findByRole('button', { name: 'Famille', pressed: true });

    const nameInput = screen.getByDisplayValue('Me Tshala');
    await user.clear(nameInput);
    await user.type(nameInput, 'Nouveau Nom');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Profil enregistré.')).toBeInTheDocument();
    expect(receivedBody).toEqual({ name: 'Nouveau Nom' });
  });

  it('efface le téléphone via null, distinct de l\'omission', async () => {
    mockThemes();
    const user = userEvent.setup();
    let receivedBody: UpdateProfilePayload | null = null;

    server.use(
      http.put('*/api/v1/profile', async ({ request }) => {
        receivedBody = (await request.json()) as UpdateProfilePayload;
        return HttpResponse.json({ success: true, data: ACCOUNT });
      }),
    );

    renderWithProviders(<IdentityCard account={ACCOUNT} />);
    await screen.findByRole('button', { name: 'Famille', pressed: true });

    await user.clear(screen.getByDisplayValue('+242068000000'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await screen.findByText('Profil enregistré.');
    expect(receivedBody).toEqual({ phone: null });
  });

  it('vider les intérêts envoie un tableau vide', async () => {
    mockThemes();
    const user = userEvent.setup();
    let receivedBody: UpdateProfilePayload | null = null;

    server.use(
      http.put('*/api/v1/profile', async ({ request }) => {
        receivedBody = (await request.json()) as UpdateProfilePayload;
        return HttpResponse.json({ success: true, data: ACCOUNT });
      }),
    );

    renderWithProviders(<IdentityCard account={ACCOUNT} />);
    const familyChip = await screen.findByRole('button', { name: 'Famille', pressed: true });
    await user.click(familyChip);
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await screen.findByText('Profil enregistré.');
    expect(receivedBody).toEqual({ interests: [] });
  });

  it('affiche l\'erreur serveur sans réinitialiser le formulaire', async () => {
    mockThemes();
    const user = userEvent.setup();

    server.use(
      http.put('*/api/v1/profile', () =>
        HttpResponse.json({ message: 'Cadre d\'usage invalide.', errors: { usage_context: ['invalide'] } }, { status: 422 }),
      ),
    );

    renderWithProviders(<IdentityCard account={ACCOUNT} />);
    const nameInput = screen.getByDisplayValue('Me Tshala');
    await user.clear(nameInput);
    await user.type(nameInput, 'Nom Local Non Sauvegardé');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cadre d\'usage invalide.');
    expect(screen.getByDisplayValue('Nom Local Non Sauvegardé')).toBeInTheDocument();
  });
});

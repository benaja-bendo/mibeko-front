import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/render';
import Account from './Account';
import { NotificationsCard } from '@/features/settings';
import type { NotificationMatrix } from '@/features/settings';

/** Réponse /profile minimale conforme à UserProfileResource. */
const ACCOUNT = {
  success: true,
  data: {
    id: 'usr_1',
    name: 'Me Tshala',
    email: 'tshala@example.cd',
    email_verified: true,
    status: 'active',
    profile: { phone: '+243810000000', profession: 'Avocat', company: 'Cabinet Mibeko' },
    roles: ['user_pro'],
    permissions: ['library.read'],
    security: { two_factor_enabled: false, two_factor_confirmed: false },
    settings: {
      locale: 'fr',
      timezone: 'Africa/Kinshasa',
      date_format: 'd/m/Y',
      notification_preferences: defaultMatrix(),
      consents: { marketing: false, marketing_at: null, analytics: false, analytics_at: null },
    },
    created_at: '2026-01-01T00:00:00+00:00',
  },
};

function defaultMatrix(): NotificationMatrix {
  return {
    extraction_update: { email: true, push: false, in_app: true },
    new_document: { email: true, push: false, in_app: true },
    share: { email: true, push: false, in_app: true },
    legal_alert: { email: true, push: false, in_app: true },
    system: { email: true, push: false, in_app: true },
    _frequency: 'instant',
  };
}

/** Mocke les trois requêtes déclenchées par la page Compte. */
function mockAccountEndpoints() {
  server.use(
    http.get('*/api/v1/profile', () => HttpResponse.json(ACCOUNT)),
    http.get('*/api/v1/profile/two-factor', () =>
      HttpResponse.json({ success: true, data: { enabled: false, confirmed: false, recovery_codes_count: 0 } }),
    ),
    http.get('*/api/v1/profile/sessions', () =>
      HttpResponse.json({
        success: true,
        data: [
          { id: 1, name: 'web', last_used_at: '2026-06-09T10:00:00+00:00', created_at: '2026-06-01T00:00:00+00:00', is_current: true },
        ],
      }),
    ),
  );
}

describe('Account page', () => {
  it('affiche les informations personnelles chargées', async () => {
    mockAccountEndpoints();

    renderWithProviders(<Account />, { route: '/settings/account' });

    // Le nom et l'email du profil sont rendus dans le formulaire d'identité.
    expect(await screen.findByDisplayValue('Me Tshala')).toBeInTheDocument();
    expect(screen.getByDisplayValue('tshala@example.cd')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Compte' })).toBeInTheDocument();
  });

  it('affiche un état d’erreur si le compte ne charge pas', async () => {
    server.use(
      http.get('*/api/v1/profile', () => HttpResponse.json({ message: 'Erreur serveur' }, { status: 500 })),
      http.get('*/api/v1/profile/two-factor', () =>
        HttpResponse.json({ success: true, data: { enabled: false, confirmed: false, recovery_codes_count: 0 } }),
      ),
      http.get('*/api/v1/profile/sessions', () => HttpResponse.json({ success: true, data: [] })),
    );

    renderWithProviders(<Account />, { route: '/settings/account' });

    expect(await screen.findByText('Réessayer')).toBeInTheDocument();
  });
});

describe('NotificationsCard', () => {
  it('envoie la matrice mise à jour et confirme l’enregistrement', async () => {
    const user = userEvent.setup();
    let receivedBody: { preferences: NotificationMatrix } | null = null;

    server.use(
      http.put('*/api/v1/profile/notification-preferences', async ({ request }) => {
        receivedBody = (await request.json()) as { preferences: NotificationMatrix };
        return HttpResponse.json({
          success: true,
          data: { ...ACCOUNT.data.settings, notification_preferences: receivedBody.preferences },
        });
      }),
    );

    renderWithProviders(<NotificationsCard preferences={defaultMatrix()} />);

    // Le bouton est désactivé tant que rien n'a changé.
    const save = screen.getByRole('button', { name: 'Enregistrer' });
    expect(save).toBeDisabled();

    // Désactive l'email des « Mises à jour d'extraction ».
    const toggle = screen.getByRole('switch', { name: "Mises à jour d'extraction – Email" });
    await user.click(toggle);

    expect(save).toBeEnabled();
    await user.click(save);

    expect(await screen.findByText('Préférences enregistrées.')).toBeInTheDocument();
    expect(receivedBody!.preferences.extraction_update.email).toBe(false);
  });
});

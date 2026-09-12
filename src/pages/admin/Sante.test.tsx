import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/render';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { AdminSante } from '@/features/admin/api/santeApi';
import Sante from './Sante';

const ADMIN_USER = {
  id: 'u-admin',
  name: 'Administrateur',
  email: 'admin@mibeko.fr',
  roles: ['admin' as const],
  permissions: [],
};

/** État au repos : aucun échec, aucun blocage, aucun retard. */
function sante(patch: Partial<AdminSante> = {}): AdminSante {
  return {
    extractions: { total_echecs: 0, echecs: [] },
    veille: { dispatches_delivres: 806, dispatches_en_echec: 0, appareils_joignables: 3 },
    mail: { echecs: [], bloques: [], total_echecs: 0, total_bloques: 0 },
    parc_mobile: { total_actifs: 3, versions: [{ version: '1.2.0', total: 2 }], version_inconnue: 1 },
    corpus: {
      published: 1083,
      pending: 125,
      signales: 0,
      versions_without_embedding: 1381,
      retard_publication: { seuil_jours: 7, documents: 0 },
    },
    ...patch,
  };
}

function mockSante(data: AdminSante) {
  server.use(http.get('*/api/v1/admin/sante', () => HttpResponse.json({ success: true, data })));
}

beforeEach(() => {
  useAuthStore.setState({ token: 'jeton-test', user: ADMIN_USER, isInitialized: true });
});

it('affiche des états vides quand rien ne va mal', async () => {
  mockSante(sante());

  renderWithProviders(<Sante />);

  expect(await screen.findByText('Aucune extraction en échec.')).toBeInTheDocument();
  expect(screen.getByText('Aucun échec.')).toBeInTheDocument();
  expect(screen.getByText('Aucun blocage.')).toBeInTheDocument();
});

it("donne le motif et le document d'une extraction en échec avec un lien vers le viewer", async () => {
  mockSante(
    sante({
      extractions: {
        total_echecs: 1,
        echecs: [
          {
            id: 'run-1',
            document_id: 'doc-1',
            document_titre: 'Décret n° 2025-240 du 20 juin 2025',
            document_slug: 'decret-2025-240',
            motif: 'Timeout MinerU au bout de 120s',
            finished_at: '2026-09-01T10:00:00Z',
          },
        ],
      },
    }),
  );

  renderWithProviders(<Sante />);

  expect(await screen.findByText('Décret n° 2025-240 du 20 juin 2025')).toBeInTheDocument();
  expect(screen.getByText('Timeout MinerU au bout de 120s')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Décret n° 2025-240/ })).toHaveAttribute('href', '/editor/viewer/doc-1');
});

it('remonte les échecs et blocages de la file de mail', async () => {
  mockSante(
    sante({
      mail: {
        echecs: [{ classe: 'PasswordResetCodeNotification', quand: '2026-09-01T10:00:00Z' }],
        bloques: [{ classe: 'UserInvitationNotification', minutes: 15 }],
        total_echecs: 1,
        total_bloques: 1,
      },
    }),
  );

  renderWithProviders(<Sante />);

  expect(await screen.findByText('PasswordResetCodeNotification')).toBeInTheDocument();
  expect(screen.getByText('UserInvitationNotification')).toBeInTheDocument();
  expect(screen.getByText('15 min')).toBeInTheDocument();
});

it('ventile le parc mobile par version', async () => {
  mockSante(sante());

  renderWithProviders(<Sante />);

  expect(await screen.findByText('1.2.0')).toBeInTheDocument();
});

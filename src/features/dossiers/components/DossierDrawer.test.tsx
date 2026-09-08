import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import DossierDrawer from './DossierDrawer';

function apiDossier() {
  return {
    id: 'd1',
    type: 'contentieux',
    title: 'Dossier export',
    reference: null,
    client: null,
    client_role: null,
    adverse: null,
    jurisdiction: null,
    nature: null,
    matiere: null,
    status: 'ouvert',
    description: null,
    color: null,
    echeances: [],
    references: [
      {
        id: 'article-1',
        type: 'article',
        title: 'Code du travail',
        breadcrumb: null,
        number: '62',
        note: null,
      },
    ],
    pieces: [],
    documents: [],
    created_at: '2026-09-08T00:00:00Z',
    updated_at: '2026-09-08T00:00:00Z',
  };
}

function entitlement(exportAllowed: boolean) {
  return {
    success: true,
    data: {
      plan: exportAllowed ? 'pro' : 'libre',
      features: { assistant: true, library: true, export: exportAllowed },
      quotas: { assistant: { used: 0, limit: 50, resets_at: null } },
      credits: null,
    },
  };
}

let exportCalls: number;

beforeEach(() => {
  exportCalls = 0;
  server.use(
    http.get('*/api/v1/dossiers', () =>
      HttpResponse.json({ success: true, data: [apiDossier()] }),
    ),
    http.get('*/api/v1/me/entitlements', () => HttpResponse.json(entitlement(false))),
    http.post('*/api/v1/dossiers/export-pdf', () => {
      exportCalls += 1;
      return new HttpResponse(new Uint8Array([37, 80, 68, 70]), {
        headers: { 'Content-Type': 'application/pdf' },
      });
    }),
  );

  Object.defineProperty(window.URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:pdf-test'),
  });
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  Reflect.deleteProperty(window.URL, 'createObjectURL');
  Reflect.deleteProperty(window.URL, 'revokeObjectURL');
});

it("n'appelle pas l'export pour un compte libre et explique le palier", async () => {
  const user = userEvent.setup();
  renderWithProviders(
    <DossierDrawer dossierId="d1" open onOpenChange={() => {}} />,
  );

  const exportButton = await screen.findByRole('button', {
    name: 'Exporter la synthèse PDF',
  });
  await waitFor(() => expect(exportButton).toBeEnabled());
  await user.click(exportButton);

  expect(await screen.findByText('L’export PDF est réservé aux comptes Mibeko Pro.'))
    .toBeInTheDocument();
  expect(exportCalls).toBe(0);
});

it("conserve l'export pour un compte Pro", async () => {
  server.use(
    http.get('*/api/v1/me/entitlements', () => HttpResponse.json(entitlement(true))),
  );
  const user = userEvent.setup();
  renderWithProviders(
    <DossierDrawer dossierId="d1" open onOpenChange={() => {}} />,
  );

  const exportButton = await screen.findByRole('button', {
    name: 'Exporter la synthèse PDF',
  });
  await waitFor(() => expect(exportButton).toBeEnabled());
  await user.click(exportButton);

  await waitFor(() => expect(exportCalls).toBe(1));
});

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import { toast } from '@/shared/store/useToast';
import DocumentReaderView from './DocumentReaderView';

/**
 * Le bouton « PDF Mibeko » est réservé à l'entitlement Pro
 * (mibeko-dashboard#86) : un compte non-Pro voit une explication (toast) au
 * lieu d'un onglet qui s'ouvre sur une erreur 403 ; un compte Pro mint une
 * URL signée puis l'ouvre.
 */
const DOCUMENT_ID = 'doc-1';

function mockDocumentEndpoints() {
  server.use(
    http.get(`*/api/v1/legal-documents/${DOCUMENT_ID}`, () =>
      HttpResponse.json({
        data: {
          id: DOCUMENT_ID,
          titre_officiel: 'Loi de test',
          legal_scope: 'national',
        },
      }),
    ),
    http.get(`*/api/v1/legal-documents/${DOCUMENT_ID}/tree`, () =>
      HttpResponse.json({ data: [] }),
    ),
  );
}

function mockEntitlements(exportEnabled: boolean) {
  server.use(
    http.get('*/api/v1/me/entitlements', () =>
      HttpResponse.json({
        success: true,
        data: {
          plan: exportEnabled ? 'pro' : 'libre',
          features: { assistant: true, library: true, export: exportEnabled },
          quotas: { assistant: { used: 0, limit: 50, resets_at: null } },
          credits: null,
        },
      }),
    ),
  );
}

describe('DocumentReaderView — PDF Mibeko (entitlement Pro)', () => {
  const openSpy = vi.fn();

  beforeEach(() => {
    mockDocumentEndpoints();
    openSpy.mockReset();
    vi.stubGlobal('open', openSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('affiche une explication au clic pour un compte non-Pro, sans appeler l\'API', async () => {
    mockEntitlements(false);
    const user = userEvent.setup();
    const toastInfoSpy = vi.spyOn(toast, 'info');

    renderWithProviders(<DocumentReaderView documentId={DOCUMENT_ID} />);

    const button = await screen.findByTitle('PDF Mibeko');
    await user.click(button);

    expect(toastInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('réservé aux comptes'),
    );
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('mint une URL signée et l\'ouvre pour un compte Pro', async () => {
    mockEntitlements(true);
    server.use(
      http.get(`*/api/v1/legal-documents/${DOCUMENT_ID}/export-token`, () =>
        HttpResponse.json({
          success: true,
          data: { url: `https://api.mibeko.fr/legal-documents/${DOCUMENT_ID}/export?signature=abc` },
        }),
      ),
    );
    const user = userEvent.setup();

    renderWithProviders(<DocumentReaderView documentId={DOCUMENT_ID} />);

    const button = await screen.findByTitle('PDF Mibeko');
    await user.click(button);

    expect(openSpy).toHaveBeenCalledWith(
      `https://api.mibeko.fr/legal-documents/${DOCUMENT_ID}/export?signature=abc`,
      '_blank',
    );
  });

  it('affiche l\'erreur serveur si le mint échoue malgré un compte marqué Pro', async () => {
    mockEntitlements(true);
    server.use(
      http.get(`*/api/v1/legal-documents/${DOCUMENT_ID}/export-token`, () =>
        HttpResponse.json(
          { message: "L'export PDF Mibeko est réservé aux comptes Pro." },
          { status: 403 },
        ),
      ),
    );
    const user = userEvent.setup();
    const toastErrorSpy = vi.spyOn(toast, 'fromError');

    renderWithProviders(<DocumentReaderView documentId={DOCUMENT_ID} />);

    const button = await screen.findByTitle('PDF Mibeko');
    await user.click(button);

    expect(toastErrorSpy).toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
  });
});

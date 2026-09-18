import { screen, waitFor } from '@testing-library/react';
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

describe('DocumentReaderView — suivi (mibeko-dashboard#125)', () => {
  beforeEach(() => {
    mockDocumentEndpoints();
    mockEntitlements(false);
  });

  it('bascule suivre/ne plus suivre le texte lu', async () => {
    const user = userEvent.setup();
    let watches: Record<string, unknown>[] = [];
    let posted: Record<string, unknown> | null = null;
    let deletedId: string | null = null;

    server.use(
      http.get('*/api/v1/watches', () => HttpResponse.json({ success: true, data: watches })),
      http.post('*/api/v1/watches', async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        const created = {
          id: 'w1',
          watchable_type: 'App\\Models\\LegalDocument',
          watchable_id: DOCUMENT_ID,
          watchable: { id: DOCUMENT_ID, titre_officiel: 'Loi de test' },
          created_at: '2026-09-17T00:00:00Z',
        };
        watches = [...watches, created];
        return HttpResponse.json({ success: true, data: created }, { status: 201 });
      }),
      http.delete('*/api/v1/watches/:id', ({ params }) => {
        deletedId = params.id as string;
        watches = watches.filter((w) => w.id !== deletedId);
        return HttpResponse.json({ success: true, message: 'Abonnement retiré.', data: null });
      }),
    );

    renderWithProviders(<DocumentReaderView documentId={DOCUMENT_ID} />);

    const button = await screen.findByTitle('Suivre');
    await user.click(button);

    await screen.findByTitle('Suivi');
    await waitFor(() =>
      expect(posted).toMatchObject({ watchable_type: 'document', watchable_id: DOCUMENT_ID }),
    );

    await user.click(screen.getByTitle('Suivi'));
    await screen.findByTitle('Suivre');
    await waitFor(() => expect(deletedId).toBe('w1'));
  });
});

/**
 * front#45 — Défaut 1 : « Suivant »/« Précédent » changeaient l'article
 * affiché sans jamais remonter l'information à `Library.tsx`, seul
 * propriétaire du paramètre `article` de l'URL. Un lien copié ou un
 * rechargement ramenait alors sur un article différent de celui lu.
 */
describe('DocumentReaderView — adresse alignée sur l\'article lu (front#45)', () => {
  const TREE_DOCUMENT_ID = 'doc-audcg';

  function mockTreeDocument() {
    server.use(
      http.get(`*/api/v1/legal-documents/${TREE_DOCUMENT_ID}`, () =>
        HttpResponse.json({
          data: { id: TREE_DOCUMENT_ID, titre_officiel: "Acte uniforme", legal_scope: 'ohada' },
        }),
      ),
      http.get(`*/api/v1/legal-documents/${TREE_DOCUMENT_ID}/tree`, () =>
        HttpResponse.json({
          data: [
            { id: 'art-101', type: 'ARTICLE', number: '101', content: 'Contenu de l\'article 101.' },
            { id: 'art-102', type: 'ARTICLE', number: '102', content: 'Contenu de l\'article 102.' },
            { id: 'art-103', type: 'ARTICLE', number: '103', content: 'Contenu de l\'article 103.' },
          ],
        }),
      ),
    );
  }

  beforeEach(() => {
    mockTreeDocument();
    mockEntitlements(false);
  });

  it('notifie le parent avec le nouvel article au clic sur « Suivant »', async () => {
    const onArticleChange = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <DocumentReaderView
        documentId={TREE_DOCUMENT_ID}
        articleId="art-101"
        onArticleChange={onArticleChange}
      />,
    );

    await screen.findByText('Article 101');
    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    await screen.findByText('Article 102');
    expect(onArticleChange).toHaveBeenCalledWith('art-102');
  });

  it('notifie aussi le parent au clic sur un article du sommaire', async () => {
    const onArticleChange = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <DocumentReaderView
        documentId={TREE_DOCUMENT_ID}
        articleId="art-101"
        onArticleChange={onArticleChange}
      />,
    );

    await screen.findByText('Article 101');
    // Bascule en mode Document pour accéder au sommaire.
    await user.click(screen.getByRole('button', { name: 'Document' }));
    await user.click(screen.getByTitle('Art. 103'));

    expect(onArticleChange).toHaveBeenCalledWith('art-103');
  });

  it('affiche un message explicite pour un lien direct vers un article inexistant, jamais le premier article à sa place', async () => {
    renderWithProviders(
      <DocumentReaderView documentId={TREE_DOCUMENT_ID} articleId="art-999-disparu" />,
    );

    await screen.findByText(/introuvable/i);
    expect(screen.queryByText('Article 101')).not.toBeInTheDocument();
    expect(screen.queryByText(/contenu de l'article 101/i)).not.toBeInTheDocument();
  });
});

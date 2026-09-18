import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/render';
import Library from './Library';

const homePayload = {
  stats: { documents: 124, articles: 14532, institutions: 11 },
  essential_documents: [
    {
      id: 'doc_code_travail',
      title: 'Code du Travail',
      type_code: 'CODE',
      type_name: 'Code',
      legal_scope: 'national',
      date_publication: '2015-03-10',
      articles_count: 320,
    },
  ],
  recent_documents: [
    {
      id: 'doc_loi_num',
      title: 'Loi récente sur le numérique',
      type_code: 'LOI',
      type_name: 'Loi',
      legal_scope: 'national',
      date_publication: '2026-01-15',
      articles_count: 42,
    },
  ],
  suggestions: ['rupture du contrat de travail'],
};

describe('Library', () => {
  beforeEach(() => {
    // La visite guidée a déjà été vue : on teste la page, pas le tour.
    localStorage.setItem('mibeko_tour_library_seen', '1');
    localStorage.removeItem('mibeko_library_recent_searches');

    server.use(
      http.get('*/api/v1/library/home', () =>
        HttpResponse.json({ success: true, data: homePayload }),
      ),
    );
  });

  // NB : la colonne gauche est rendue deux fois (variante desktop + mobile,
  // départagées en CSS que jsdom n'applique pas) → requêtes `AllBy`.

  it("affiche l'accueil vivant (récents, fondamentaux) sans recherche", async () => {
    renderWithProviders(<Library />, { route: '/app/library' });

    await waitFor(() => {
      expect(screen.getAllByText('Code du Travail').length).toBeGreaterThan(0);
    });
    expect(
      screen.getAllByText('Loi récente sur le numérique').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Textes fondamentaux').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ajoutés récemment').length).toBeGreaterThan(0);
  });

  it('garde les filtres fermés par défaut', async () => {
    renderWithProviders(<Library />, { route: '/app/library' });

    await waitFor(() => {
      expect(screen.getAllByText('Code du Travail').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Tous périmètres')).not.toBeInTheDocument();
  });

  it("lance une recherche depuis une suggestion et mémorise l'historique", async () => {
    server.use(
      http.get('*/api/v1/library/search', () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 'art_1',
              number: '12',
              content: 'La rupture du contrat de travail est encadrée…',
              document_id: 'doc_code_travail',
              document_title: 'Code du Travail',
              breadcrumb: 'Code > Code du Travail',
              legal_scope: 'national',
              score: 0.91,
            },
          ],
          pagination: { total: 1, per_page: 12, current_page: 1, last_page: 1 },
        }),
      ),
    );

    renderWithProviders(<Library />, { route: '/app/library' });

    const suggestions = await screen.findAllByRole('button', {
      name: 'rupture du contrat de travail',
    });
    await userEvent.click(suggestions[0]);

    await waitFor(() => {
      expect(screen.getAllByText('1 résultat').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Code du Travail').length).toBeGreaterThan(0);

    // La recherche est mémorisée localement pour l'accueil.
    expect(
      JSON.parse(localStorage.getItem('mibeko_library_recent_searches') ?? '[]'),
    ).toContain('rupture du contrat de travail');
  });

  it("ouvrir un résultat de recherche mesure l'activation (mibeko-dashboard#137)", async () => {
    server.use(
      http.get('*/api/v1/library/search', () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 'art_1',
              number: '12',
              content: 'La rupture du contrat de travail est encadrée…',
              document_id: 'doc_code_travail',
              document_title: 'Code du Travail',
              breadcrumb: 'Code > Code du Travail',
              legal_scope: 'national',
              score: 0.91,
            },
          ],
          pagination: { total: 1, per_page: 12, current_page: 1, last_page: 1 },
        }),
      ),
      http.get('*/api/v1/legal-documents/doc_code_travail', () =>
        HttpResponse.json({ data: { id: 'doc_code_travail', titre_officiel: 'Code du Travail', legal_scope: 'national' } }),
      ),
      http.get('*/api/v1/legal-documents/doc_code_travail/tree', () => HttpResponse.json({ data: [] })),
    );

    let receivedBody: Record<string, unknown> | null = null;
    server.use(
      http.post('*/api/v1/product-events', async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { success: true, message: 'Événement enregistré.', data: { id: 'evt_1', event_type: 'search_useful', created_at: '2026-01-01T00:00:00+00:00' } },
          { status: 201 },
        );
      }),
    );

    renderWithProviders(<Library />, { route: '/app/library' });

    const suggestions = await screen.findAllByRole('button', { name: 'rupture du contrat de travail' });
    await userEvent.click(suggestions[0]);
    await waitFor(() => expect(screen.getAllByText('1 résultat').length).toBeGreaterThan(0));

    const [resultButton] = screen.getAllByText('Code > Code du Travail').map((el) => el.closest('button'));
    await userEvent.click(resultButton!);

    await waitFor(() =>
      expect(receivedBody).toMatchObject({ event_type: 'search_useful', surface: 'web', reference_id: 'art_1' }),
    );
  });
});

/**
 * front#45 — Défaut 1 : « Suivant »/« Précédent » dans le lecteur changeaient
 * l'article affiché sans jamais remonter l'information à `Library.tsx`, seul
 * propriétaire du paramètre `article` de l'URL — un lien copié ou un
 * rechargement ramenait alors sur un article différent de celui lu.
 */
describe("Library — l'adresse désigne l'article lu (front#45)", () => {
  const DOCUMENT_ID = 'doc-audcg';

  beforeEach(() => {
    localStorage.setItem('mibeko_tour_library_seen', '1');
    server.use(
      http.get('*/api/v1/library/home', () =>
        HttpResponse.json({ success: true, data: homePayload }),
      ),
      http.get(`*/api/v1/legal-documents/${DOCUMENT_ID}`, () =>
        HttpResponse.json({
          data: { id: DOCUMENT_ID, titre_officiel: 'Acte uniforme', legal_scope: 'ohada' },
        }),
      ),
      http.get(`*/api/v1/legal-documents/${DOCUMENT_ID}/tree`, () =>
        HttpResponse.json({
          data: [
            { id: 'art-101', type: 'ARTICLE', number: '101', content: 'Contenu 101.' },
            { id: 'art-102', type: 'ARTICLE', number: '102', content: 'Contenu 102.' },
            { id: 'art-103', type: 'ARTICLE', number: '103', content: 'Contenu 103.' },
          ],
        }),
      ),
    );
  });

  it("« Suivant » met à jour l'URL, et le retour navigateur revient à l'article précédent — pas au premier", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createMemoryRouter([{ path: '*', element: <Library /> }], {
      initialEntries: [`/app/library?doc=${DOCUMENT_ID}&article=art-101`],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getAllByText('Article 101').length).toBeGreaterThan(0),
    );

    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: 'Suivant' })[0]);
    await waitFor(() =>
      expect(screen.getAllByText('Article 102').length).toBeGreaterThan(0),
    );
    expect(router.state.location.search).toContain('article=art-102');

    await user.click(screen.getAllByRole('button', { name: 'Suivant' })[0]);
    await waitFor(() =>
      expect(screen.getAllByText('Article 103').length).toBeGreaterThan(0),
    );
    expect(router.state.location.search).toContain('article=art-103');

    // Retour navigateur : doit ressortir sur le 102 (l'étape précédente),
    // jamais sur le 101 (le premier article du document).
    await router.navigate(-1);
    await waitFor(() =>
      expect(router.state.location.search).toContain('article=art-102'),
    );
    expect(router.state.location.search).not.toContain('article=art-101');
  });
});

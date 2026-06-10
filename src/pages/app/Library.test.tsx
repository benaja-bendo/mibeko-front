import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
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

  it("affiche l'accueil vivant (récents, fondamentaux, stats) sans recherche", async () => {
    renderWithProviders(<Library />, { route: '/app/library' });

    await waitFor(() => {
      expect(screen.getAllByText('Code du Travail').length).toBeGreaterThan(0);
    });
    expect(
      screen.getAllByText('Loi récente sur le numérique').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Textes fondamentaux').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ajoutés récemment').length).toBeGreaterThan(0);
    // Stat du fonds (format compact fr-FR : 14 532 → « 14,5 k »)
    expect(screen.getAllByText(/14,5/).length).toBeGreaterThan(0);
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
});

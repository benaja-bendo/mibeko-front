import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/render';
import ProJournals from './Journals';

/**
 * Kiosque du Journal officiel (front#60) : un numéro publié sans texte
 * structuré se lit par son PDF officiel. Le kiosque le dit, comme le mobile,
 * au lieu d'afficher « 0 texte » (décision D-056).
 */
const numero = (id: string, number: string, publication_date: string, legal_documents_count: number) => ({
  id,
  title: `Journal officiel n° ${number}`,
  number,
  publication_date,
  is_published: true,
  legal_documents_count,
});

const dernier = numero('jo-23-2026', '23-2026', '2026-06-04T00:00:00+00:00', 16);
const sansTexte = numero('jo-6-2026', '6-2026', '2026-04-20T00:00:00+00:00', 0);
const unTexte = numero('jo-2-2010', '2-2010', '2010-10-29T00:00:00+00:00', 1);

describe('Kiosque du Journal officiel', () => {
  beforeEach(() => {
    server.use(
      http.get('*/api/v1/official-journals/years', () =>
        HttpResponse.json({ data: [{ year: 2026, total: 2 }, { year: 2010, total: 1 }] }),
      ),
      http.get('*/api/v1/official-journals', ({ request }) => {
        const perPage = Number(new URL(request.url).searchParams.get('per_page'));
        const data = perPage === 1 ? [dernier] : [dernier, sansTexte, unTexte];
        return HttpResponse.json({
          data,
          meta: { current_page: 1, last_page: 1, total: data.length, per_page: perPage },
        });
      }),
    );
  });

  it('dit ce que contient chaque numéro, et jamais « 0 texte »', async () => {
    renderWithProviders(<ProJournals />, { route: '/app/journals' });

    // Vitrine du dernier numéro paru + sa carte dans la grille.
    expect(await screen.findAllByText(/16 textes publiés/)).toHaveLength(2);
    expect(screen.getByText('Texte intégral (PDF)')).toBeInTheDocument();
    expect(screen.getByText('1 texte publié')).toBeInTheDocument();
    expect(screen.queryByText(/\b0 texte/)).not.toBeInTheDocument();
  });
});

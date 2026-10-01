import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/render';
import JournalView from './JournalView';

// react-pdf ne se rend pas dans jsdom ; l'aperçu n'est pas l'objet du test.
vi.mock('@/features/journals/components/JournalPdfPreview', () => ({
  default: () => <div data-testid="apercu-pdf" />,
}));

/**
 * Un numéro publié sans texte structuré (front#60, D-056) : la page ne promet
 * pas une intégration à venir, elle renvoie à son PDF officiel.
 */
describe("Page d'un numéro du Journal officiel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renvoie au PDF original quand le numéro n\'a aucun texte structuré', async () => {
    server.use(
      http.get('*/api/v1/official-journals/:id', () =>
        HttpResponse.json({
          id: 'jo-6-2026',
          title: 'Journal officiel n° 6-2026',
          number: '6',
          publication_date: '2026-04-20T00:00:00+00:00',
          is_published: true,
          legal_documents: [],
        }),
      ),
    );
    const ouvrir = vi.spyOn(window, 'open').mockImplementation(() => null);

    renderWithProviders(
      <Routes>
        <Route path="/app/journals/:id" element={<JournalView />} />
      </Routes>,
      { route: '/app/journals/jo-6-2026' },
    );

    expect(await screen.findByText(/ne sont pas structurés dans Mibeko/)).toBeInTheDocument();
    expect(screen.getByText(/Texte intégral \(PDF\)/)).toBeInTheDocument();
    expect(screen.queryByText(/\b0 texte/)).not.toBeInTheDocument();
    expect(screen.queryByText(/en cours d'intégration/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Lire le PDF original/ }));
    expect(ouvrir).toHaveBeenCalledWith(
      expect.stringContaining('/legal-documents/jo-6-2026/pdf?type=journal'),
      '_blank',
    );
  });
});

import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { renderWithProviders } from '../test/render';
import LegalDocuments from './LegalDocuments';

describe('LegalDocuments', () => {
  it('affiche l’état vide quand aucun document n’est retourné', async () => {
    server.use(
      http.get('*/api/v1/legal-documents', () =>
        HttpResponse.json({
          success: true,
          data: [],
          pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
        })
      )
    );

    renderWithProviders(<LegalDocuments />);

    expect(screen.getByRole('heading', { name: 'Documents juridiques' })).toBeInTheDocument();
    // La liste rend deux vues (tableau ≥ lg + cartes en dessous, bascule CSS) :
    // l'état vide apparaît donc dans les deux. On tolère ≥ 1 occurrence.
    await waitFor(() => {
      expect(screen.getAllByText('Aucun document trouvé').length).toBeGreaterThan(0);
    });
  });

  it('affiche une ligne quand un document est retourné', async () => {
    server.use(
      http.get('*/api/v1/legal-documents', () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 'doc_1',
              titre_officiel: 'Loi n° 1',
              reference_nor: 'NOR123',
              type_code: 'LOI',
              date_publication: '2026-01-01',
              statut: 'vigueur',
            },
          ],
          pagination: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
        })
      )
    );

    renderWithProviders(<LegalDocuments />);

    // Titre présent dans la vue cartes ET la vue tableau (bascule CSS) → ≥ 1.
    await waitFor(() => {
      expect(screen.getAllByText('Loi n° 1').length).toBeGreaterThan(0);
    });
    // La référence NOR n'est rendue que dans le tableau.
    expect(screen.getByText('NOR123')).toBeInTheDocument();
  });
});

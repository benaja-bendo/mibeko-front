import { screen } from '@testing-library/react';
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

    expect(screen.getByRole('heading', { name: 'Documents légaux' })).toBeInTheDocument();
    expect(await screen.findByText('Aucun document trouvé')).toBeInTheDocument();
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

    expect(await screen.findByText('Loi n° 1')).toBeInTheDocument();
    expect(screen.getByText('NOR123')).toBeInTheDocument();
  });
});

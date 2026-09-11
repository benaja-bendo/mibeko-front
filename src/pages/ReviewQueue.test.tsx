import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { renderWithProviders } from '../test/render';
import ReviewQueue from './ReviewQueue';

describe('ReviewQueue', () => {
  it('affiche l’état vide quand aucun document n’est en revue', async () => {
    server.use(
      http.get('*/api/v1/review-queue', () =>
        HttpResponse.json({
          success: true,
          data: [],
          pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
        })
      )
    );

    renderWithProviders(<ReviewQueue />);

    expect(screen.getByRole('heading', { name: 'File de revue' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Aucun document dans cette file')).toBeInTheDocument();
    });
  });

  it('affiche la priorité, le motif de blocage et l’action de prise en charge', async () => {
    server.use(
      http.get('*/api/v1/review-queue', () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 'doc_1',
              titre_officiel: 'Loi n° 1',
              libelle_descriptif: null,
              type: null,
              curation_status: 'review',
              curation_status_changed_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
              updated_at: null,
              assigned_to: null,
              assignee: null,
              assigned_at: null,
              blocking_flags_count: 2,
              warning_flags_count: 0,
            },
          ],
          pagination: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
        })
      )
    );

    renderWithProviders(<ReviewQueue />);

    await waitFor(() => {
      expect(screen.getByText('Loi n° 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('2 bloquants')).toBeInTheDocument();
    expect(screen.getByText('3 jours')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prendre en charge' })).toBeInTheDocument();
  });
});

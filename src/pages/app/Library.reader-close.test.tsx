import { vi } from 'vitest';

// La logique « replier / rouvrir » du panneau droit est spécifique au desktop
// (`useIsDesktop`). En jsdom, matchMedia renvoie toujours false : on force donc
// le mode desktop pour exercer ce chemin.
vi.mock('@/shared/hooks/useMediaQuery', () => ({
  useMediaQuery: () => true,
  useIsDesktop: () => true,
}));

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/render';
import Library from './Library';

const homePayload = {
  stats: { documents: 124, articles: 14532, institutions: 11 },
  essential_documents: [],
  recent_documents: [],
  suggestions: ['rupture du contrat de travail'],
};

const searchPayload = {
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
};

/** Mocke l'accueil, la recherche et le document ouvert par le lecteur. */
function mockEndpoints() {
  server.use(
    http.get('*/api/v1/library/home', () =>
      HttpResponse.json({ success: true, data: homePayload }),
    ),
    http.get('*/api/v1/library/search', () => HttpResponse.json(searchPayload)),
    http.get('*/legal-documents/doc_code_travail', () =>
      HttpResponse.json({
        data: {
          id: 'doc_code_travail',
          titre_officiel: 'Code du Travail',
          legal_scope: 'national',
        },
      }),
    ),
    http.get('*/legal-documents/doc_code_travail/tree', () =>
      HttpResponse.json({ data: [] }),
    ),
  );
}

/** Recherche puis ouvre le premier résultat dans le lecteur. */
async function openReader() {
  const suggestion = (
    await screen.findAllByRole('button', {
      name: 'rupture du contrat de travail',
    })
  )[0];
  await userEvent.click(suggestion);

  const result = (await screen.findAllByText('Code du Travail'))[0];
  await userEvent.click(result);

  // Le lecteur est chargé quand son bouton de fermeture apparaît.
  return screen.findByRole('button', { name: 'Fermer la lecture' });
}

describe('Library — fermeture du panneau de lecture (desktop)', () => {
  beforeEach(() => {
    localStorage.setItem('mibeko_tour_library_seen', '1');
    localStorage.removeItem('mibeko_library_recent_searches');
    mockEndpoints();
  });

  it('replie le lecteur via le bouton X, puis le rail le rouvre', async () => {
    renderWithProviders(<Library />, { route: '/app/library' });

    const closeButton = await openReader();

    // Avant fermeture : pas de rail de réouverture.
    expect(
      screen.queryByRole('button', { name: 'Rouvrir le panneau de lecture' }),
    ).not.toBeInTheDocument();

    // Fermer → le lecteur disparaît, le rail apparaît.
    await userEvent.click(closeButton);
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Fermer la lecture' }),
      ).not.toBeInTheDocument();
    });
    const rail = screen.getByRole('button', {
      name: 'Rouvrir le panneau de lecture',
    });

    // Rouvrir via le rail → le lecteur réapparaît (la sélection est conservée).
    await userEvent.click(rail);
    expect(
      await screen.findByRole('button', { name: 'Fermer la lecture' }),
    ).toBeInTheDocument();
  });

  it('replie le lecteur avec la touche Échap', async () => {
    renderWithProviders(<Library />, { route: '/app/library' });

    await openReader();

    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Fermer la lecture' }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: 'Rouvrir le panneau de lecture' }),
    ).toBeInTheDocument();
  });
});

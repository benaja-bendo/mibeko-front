import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import {
  __resetAnnexMigrationForTests,
  migrateLocalAnnexes,
} from './migrateLocalAnnexes';

const LEGACY_KEY = 'mibeko_dossier_annexes';

/** Écrit un store legacy au format zustand persist. */
function seedLegacy(byId: Record<string, unknown>) {
  localStorage.setItem(LEGACY_KEY, JSON.stringify({ state: { byId }, version: 0 }));
}

beforeEach(() => {
  __resetAnnexMigrationForTests();
  localStorage.clear();
});

it('remonte les annexes locales vers l’API puis purge le localStorage', async () => {
  const posts: string[] = [];

  server.use(
    http.post('*/api/v1/dossiers/:id/references', async ({ params }) => {
      posts.push(`ref:${params.id}`);
      return HttpResponse.json({
        success: true,
        data: {
          id: 'art-1',
          type: 'article',
          title: 'Code du travail',
          breadcrumb: null,
          number: '62',
          note: null,
        },
      });
    }),
    http.post('*/api/v1/dossiers/:id/pieces', async ({ params }) => {
      posts.push(`piece:${params.id}`);
      return HttpResponse.json({
        success: true,
        data: {
          id: 'piece-1',
          name: 'a.pdf',
          size: 1,
          mime: 'application/pdf',
          note: null,
          added_at: '2026-07-03T00:00:00Z',
        },
      });
    }),
  );

  seedLegacy({
    d1: {
      references: [{ id: 'art-1', type: 'article', title: 'Code du travail', number: '62' }],
      pieces: [{ id: 'p1', name: 'a.pdf', size: 1, mime: 'application/pdf', addedAt: 'x' }],
      documents: [],
    },
    // Dossier non possédé : conservé pour plus tard, pas remonté.
    dX: {
      references: [{ id: 'art-9', type: 'article', title: 'Autre' }],
      pieces: [],
      documents: [],
    },
  });

  let doneCalled = false;
  await migrateLocalAnnexes(['d1'], () => {
    doneCalled = true;
  });

  expect(posts).toEqual(['ref:d1', 'piece:d1']);
  expect(doneCalled).toBe(true);

  // Le dossier possédé est purgé ; le non-possédé reste en attente.
  const remainder = JSON.parse(localStorage.getItem(LEGACY_KEY)!);
  expect(remainder.state.byId).toHaveProperty('dX');
  expect(remainder.state.byId).not.toHaveProperty('d1');
});

it('ne fait rien sans données legacy et ne s’exécute qu’une fois', async () => {
  const posts: string[] = [];
  server.use(
    http.post('*/api/v1/dossiers/:id/references', () => {
      posts.push('ref');
      return HttpResponse.json({ success: true, data: {} });
    }),
  );

  await migrateLocalAnnexes(['d1']);
  expect(posts).toHaveLength(0);

  // Même après avoir semé des données, le verrou de session bloque un 2e run.
  seedLegacy({
    d1: { references: [{ id: 'a', type: 'article', title: 't' }], pieces: [], documents: [] },
  });
  await migrateLocalAnnexes(['d1']);
  expect(posts.length).toBe(0);
  // La clé n'a pas été touchée par le run verrouillé.
  expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
});

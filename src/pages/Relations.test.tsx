import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import Relations from './Relations';

const pagination = { total: 1, per_page: 20, current_page: 1, last_page: 1 };

const candidate = {
  id: 'rel-1',
  relation_type: 'ABROGE',
  status: 'candidate',
  source: 'heuristic',
  confidence: 0.9,
  commentaire: null,
  effective_date: null,
  meta: { extrait_source: 'abroge le décret n° 2025-100 du 3 janvier 2025' },
  source_doc_id: 'doc-source',
  target_doc_id: 'doc-target',
  source_article_id: 'art-1',
  target_article_id: null,
  source_document: { id: 'doc-source', titre_officiel: 'Décret n° 2026-001' },
  target_document: { id: 'doc-target', titre_officiel: 'Décret n° 2025-100 du 3 janvier 2025' },
  source_article: { id: 'art-1', numero_article: '1' },
  target_article: null,
  created_at: '2026-09-14T00:00:00Z',
  reviewed_at: null,
};

it('affiche les relations candidates avec leur extrait détecté', async () => {
  server.use(
    http.get('*/api/v1/document-relations', () => HttpResponse.json({ data: [candidate], pagination })),
  );

  renderWithProviders(<Relations />, { route: '/editor/relations' });

  expect(await screen.findByText('Abroge')).toBeInTheDocument();
  expect(screen.getByText(/abroge le décret n° 2025-100/)).toBeInTheDocument();
  expect(screen.getByText('90%')).toBeInTheDocument();
});

it('valide une relation candidate', async () => {
  let called = false;
  server.use(
    http.get('*/api/v1/document-relations', () => HttpResponse.json({ data: [candidate], pagination })),
    http.post('*/api/v1/relations/rel-1/valider', () => {
      called = true;
      return HttpResponse.json({ data: { ...candidate, status: 'confirmed' } });
    }),
  );

  renderWithProviders(<Relations />, { route: '/editor/relations' });
  const user = userEvent.setup();

  await user.click(await screen.findByRole('button', { name: 'Valider' }));

  expect(await screen.findByText('Relation validée')).toBeInTheDocument();
  expect(called).toBe(true);
});

it('rejette une relation candidate avec un motif', async () => {
  let received: unknown;
  server.use(
    http.get('*/api/v1/document-relations', () => HttpResponse.json({ data: [candidate], pagination })),
    http.post('*/api/v1/relations/rel-1/rejeter', async ({ request }) => {
      received = await request.json();
      return HttpResponse.json({ data: { ...candidate, status: 'rejected' } });
    }),
  );

  renderWithProviders(<Relations />, { route: '/editor/relations' });
  const user = userEvent.setup();

  await user.click(await screen.findByRole('button', { name: 'Rejeter' }));
  await user.type(screen.getByLabelText('Motif (optionnel)'), 'Mauvaise cible');
  await user.click(screen.getByRole('button', { name: 'Rejeter' }));

  expect(await screen.findByText('Relation rejetée')).toBeInTheDocument();
  expect(received).toEqual({ commentaire: 'Mauvaise cible' });
});

it('filtre par onglet de statut', async () => {
  server.use(
    http.get('*/api/v1/document-relations', ({ request }) => {
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      if (status === 'confirmed') {
        return HttpResponse.json({ data: [{ ...candidate, id: 'rel-2', status: 'confirmed' }], pagination });
      }
      return HttpResponse.json({ data: [candidate], pagination });
    }),
  );

  renderWithProviders(<Relations />, { route: '/editor/relations' });
  const user = userEvent.setup();

  expect(await screen.findByText('Abroge')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Confirmées' }));

  expect(await screen.findByText('Confirmée')).toBeInTheDocument();
});

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import Recherches from './Recherches';

const pagination = { current_page: 1, last_page: 1, total: 1 };

it('affiche les requêtes sans résultat par défaut, puis les requêtes fréquentes', async () => {
  server.use(
    http.get('*/api/v1/admin/search-logs/no-results', () =>
      HttpResponse.json({ data: [{ query: 'code minier', volume: 4, last_searched_at: '2026-09-18T10:00:00Z' }], pagination }),
    ),
    http.get('*/api/v1/admin/search-logs/top', () =>
      HttpResponse.json({ data: [{ query: 'contrat de travail', volume: 20, last_searched_at: '2026-09-18T09:00:00Z' }], pagination }),
    ),
  );

  renderWithProviders(<Recherches />);

  expect(await screen.findByText('« code minier »')).toBeInTheDocument();

  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Fréquentes' }));

  expect(await screen.findByText('« contrat de travail »')).toBeInTheDocument();
  expect(screen.queryByText('« code minier »')).not.toBeInTheDocument();
});

it('signale un échec de lecture et permet de réessayer', async () => {
  let fail = true;
  server.use(
    http.get('*/api/v1/admin/search-logs/no-results', () =>
      fail
        ? HttpResponse.json({ message: 'Lecture indisponible' }, { status: 500 })
        : HttpResponse.json({ data: [{ query: 'code minier', volume: 1, last_searched_at: '2026-09-18T10:00:00Z' }], pagination }),
    ),
  );

  renderWithProviders(<Recherches />);

  expect(await screen.findByText('Lecture indisponible')).toBeInTheDocument();
  fail = false;
  await userEvent.click(screen.getByRole('button', { name: 'Réessayer la liste' }));

  expect(await screen.findByText('« code minier »')).toBeInTheDocument();
});

it('affiche un message quand aucune recherche sans résultat sur la fenêtre', async () => {
  server.use(
    http.get('*/api/v1/admin/search-logs/no-results', () => HttpResponse.json({ data: [], pagination: { ...pagination, total: 0 } })),
  );

  renderWithProviders(<Recherches />);

  expect(await screen.findByText('Aucune recherche sans résultat sur cette fenêtre.')).toBeInTheDocument();
});

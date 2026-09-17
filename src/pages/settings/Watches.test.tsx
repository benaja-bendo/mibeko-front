import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import Watches from './Watches';

it('liste les textes et thèmes suivis, vide par défaut', async () => {
  server.use(http.get('*/api/v1/watches', () => HttpResponse.json({ success: true, data: [] })));

  renderWithProviders(<Watches />);

  expect(await screen.findByText(/Aucun texte suivi/)).toBeInTheDocument();
  expect(screen.getByText(/Aucun thème suivi/)).toBeInTheDocument();
});

it('affiche les abonnements existants et permet de se désabonner', async () => {
  let deletedId: string | null = null;

  server.use(
    http.get('*/api/v1/watches', () =>
      HttpResponse.json({
        success: true,
        data: [
          {
            id: 'w1',
            watchable_type: 'App\\Models\\LegalDocument',
            watchable_id: 'doc-1',
            watchable: { id: 'doc-1', titre_officiel: 'Loi sur le travail' },
            created_at: '2026-09-17T00:00:00Z',
          },
          {
            id: 'w2',
            watchable_type: 'App\\Models\\Tag',
            watchable_id: 'theme-1',
            watchable: { id: 'theme-1', name: 'Fiscalité', slug: 'fiscalite', icon: null },
            created_at: '2026-09-17T00:00:00Z',
          },
        ],
      }),
    ),
    http.delete('*/api/v1/watches/:id', ({ params }) => {
      deletedId = params.id as string;
      return HttpResponse.json({ success: true, message: 'Abonnement retiré.', data: null });
    }),
  );

  const user = userEvent.setup();
  renderWithProviders(<Watches />);

  const documentLink = await screen.findByRole('link', { name: 'Loi sur le travail' });
  expect(documentLink).toHaveAttribute('href', '/app/library?doc=doc-1');

  const themeLink = screen.getByRole('link', { name: 'Fiscalité' });
  expect(themeLink).toHaveAttribute('href', '/app/library?theme=fiscalite');

  await user.click(screen.getAllByTitle('Ne plus suivre')[0]);
  await waitFor(() => expect(deletedId).toBe('w1'));
});

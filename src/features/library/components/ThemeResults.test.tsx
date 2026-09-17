import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import ThemeResults from './ThemeResults';

function mockThemeDocuments() {
  server.use(
    http.get('*/api/v1/library/themes/travail', () =>
      HttpResponse.json({
        success: true,
        data: {
          theme: { id: 'theme-1', name: 'Droit du travail', slug: 'travail', icon: null, description: null },
          documents: [],
        },
      }),
    ),
  );
}

it('permet de suivre puis de ne plus suivre un thème', async () => {
  mockThemeDocuments();
  const user = userEvent.setup();
  let watches: Record<string, unknown>[] = [];
  let posted: Record<string, unknown> | null = null;
  let deletedId: string | null = null;

  server.use(
    http.get('*/api/v1/watches', () => HttpResponse.json({ success: true, data: watches })),
    http.post('*/api/v1/watches', async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>;
      const created = {
        id: 'w1',
        watchable_type: 'App\\Models\\Tag',
        watchable_id: 'theme-1',
        watchable: { id: 'theme-1', name: 'Droit du travail', slug: 'travail', icon: null },
        created_at: '2026-09-17T00:00:00Z',
      };
      watches = [...watches, created];
      return HttpResponse.json({ success: true, data: created }, { status: 201 });
    }),
    http.delete('*/api/v1/watches/:id', ({ params }) => {
      deletedId = params.id as string;
      watches = watches.filter((w) => w.id !== deletedId);
      return HttpResponse.json({ success: true, message: 'Abonnement retiré.', data: null });
    }),
  );

  renderWithProviders(<ThemeResults slug="travail" onOpenDocument={() => {}} onClear={() => {}} />);

  const button = await screen.findByRole('button', { name: 'Suivre' });
  await user.click(button);

  await screen.findByRole('button', { name: 'Suivi' });
  await waitFor(() =>
    expect(posted).toMatchObject({ watchable_type: 'theme', watchable_id: 'theme-1' }),
  );

  await user.click(screen.getByRole('button', { name: 'Suivi' }));
  await screen.findByRole('button', { name: 'Suivre' });
  await waitFor(() => expect(deletedId).toBe('w1'));
});

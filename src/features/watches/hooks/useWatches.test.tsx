import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import { useWatchDocument, useWatchTheme } from './useWatches';

/** Harnais : bascule un abonnement document et expose son état (un seul nœud texte). */
function DocumentHarness() {
  const watch = useWatchDocument({ id: 'doc-1', titre_officiel: 'Loi de test' });
  return (
    <div>
      <p>{`watching:${watch.isWatching}`}</p>
      <button onClick={watch.toggle}>toggle</button>
    </div>
  );
}

/** Harnais : bascule un abonnement thème et expose son état. */
function ThemeHarness() {
  const watch = useWatchTheme({ id: 'theme-1', name: 'Droit du travail', slug: 'travail', icon: null });
  return (
    <div>
      <p>{`watching:${watch.isWatching}`}</p>
      <button onClick={watch.toggle}>toggle</button>
    </div>
  );
}

it("s'abonne à un texte, avec bascule optimiste immédiate puis cohérente au refetch", async () => {
  const user = userEvent.setup();
  let watches: Record<string, unknown>[] = [];
  let posted: Record<string, unknown> | null = null;

  server.use(
    http.get('*/api/v1/watches', () => HttpResponse.json({ success: true, data: watches })),
    http.post('*/api/v1/watches', async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>;
      const created = {
        id: 'w1',
        watchable_type: 'App\\Models\\LegalDocument',
        watchable_id: posted.watchable_id,
        watchable: { id: 'doc-1', titre_officiel: 'Loi de test' },
        created_at: '2026-09-17T00:00:00Z',
      };
      watches = [...watches, created];
      return HttpResponse.json({ success: true, data: created }, { status: 201 });
    }),
  );

  renderWithProviders(<DocumentHarness />);

  await screen.findByText('watching:false');
  await user.click(screen.getByText('toggle'));

  // Retour visuel immédiat avant même la résolution de la requête, confirmé
  // ensuite par le refetch déclenché par la mutation.
  await screen.findByText('watching:true');
  await waitFor(() =>
    expect(posted).toMatchObject({ watchable_type: 'document', watchable_id: 'doc-1' }),
  );
});

it("se désabonne d'un thème déjà suivi", async () => {
  const user = userEvent.setup();
  let watches: Record<string, unknown>[] = [
    {
      id: 'w2',
      watchable_type: 'App\\Models\\Tag',
      watchable_id: 'theme-1',
      watchable: { id: 'theme-1', name: 'Droit du travail', slug: 'travail', icon: null },
      created_at: '2026-09-17T00:00:00Z',
    },
  ];
  let deletedId: string | null = null;

  server.use(
    http.get('*/api/v1/watches', () => HttpResponse.json({ success: true, data: watches })),
    http.delete('*/api/v1/watches/:id', ({ params }) => {
      deletedId = params.id as string;
      watches = watches.filter((w) => w.id !== deletedId);
      return HttpResponse.json({ success: true, message: 'Abonnement retiré.', data: null });
    }),
  );

  renderWithProviders(<ThemeHarness />);

  await screen.findByText('watching:true');
  await user.click(screen.getByText('toggle'));

  await screen.findByText('watching:false');
  await waitFor(() => expect(deletedId).toBe('w2'));
});

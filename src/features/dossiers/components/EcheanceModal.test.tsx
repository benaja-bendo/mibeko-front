import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import EcheanceModal from './EcheanceModal';

it('crée une échéance avec les rappels par défaut', async () => {
  const user = userEvent.setup();
  const onOpenChange = vi.fn();
  let body: Record<string, unknown> | null = null;

  server.use(
    http.post('*/api/v1/dossiers/:id/echeances', async ({ request, params }) => {
      body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        success: true,
        data: {
          id: 'e1',
          dossier_id: params.id,
          type: body.type,
          title: body.title,
          due_date: body.due_date ?? null,
          status: body.status ?? 'a_venir',
          trigger_event: null,
          trigger_date: null,
          rule_id: null,
          basis_article_id: null,
          is_confirmed: false,
          reminders: body.reminders ?? [],
          note: body.note ?? null,
        },
      });
    }),
  );

  renderWithProviders(
    <EcheanceModal open dossierId="d1" onOpenChange={onOpenChange} />,
  );

  await user.type(screen.getByLabelText(/Intitulé/i), 'Audience de plaidoirie');
  await user.click(screen.getByRole('button', { name: /Ajouter/i }));

  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));

  expect(body).toMatchObject({
    type: 'audience',
    title: 'Audience de plaidoirie',
    reminders: [15, 7, 2, 0],
  });
});

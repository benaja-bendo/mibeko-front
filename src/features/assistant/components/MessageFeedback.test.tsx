import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import MessageFeedback from './MessageFeedback';

describe('MessageFeedback', () => {
  it('envoie un avis 👍 puis le retire au second clic', async () => {
    const posted: Array<Record<string, unknown>> = [];
    let deleted = 0;

    server.use(
      http.post('*/api/v1/assistant/messages/:id/feedback', async ({ request }) => {
        posted.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ message_id: 'msg_1', rating: 'up' });
      }),
      http.delete('*/api/v1/assistant/messages/:id/feedback', () => {
        deleted += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<MessageFeedback messageId="msg_1" />);

    const thumbUp = screen.getByRole('button', { name: 'Réponse utile' });

    // 1er clic : avis positif enregistré, bouton actif.
    await user.click(thumbUp);
    expect(thumbUp).toHaveAttribute('aria-pressed', 'true');
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ rating: 'up' });

    // 2e clic sur le même avis : retrait (DELETE), bouton inactif.
    await user.click(thumbUp);
    expect(thumbUp).toHaveAttribute('aria-pressed', 'false');
    await vi.waitFor(() => expect(deleted).toBe(1));
  });

  it('restitue l\'avis initial et bascule 👍 → 👎', async () => {
    server.use(
      http.post('*/api/v1/assistant/messages/:id/feedback', () =>
        HttpResponse.json({ message_id: 'msg_2', rating: 'down' }),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(
      <MessageFeedback messageId="msg_2" initialRating="up" />,
    );

    expect(screen.getByRole('button', { name: 'Réponse utile' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Réponse à améliorer' }));

    expect(
      screen.getByRole('button', { name: 'Réponse à améliorer' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Réponse utile' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

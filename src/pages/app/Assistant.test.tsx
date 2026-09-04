import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/render';
import Assistant from './Assistant';

const emptyConversations = {
  data: [],
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
};

/** Corps SSE minimal : un fragment de texte puis la fin de flux. */
const SSE_BODY =
  'data: {"type":"text_delta","delta":"Le préavis est d\'un mois [1]."}\n\n' +
  'data: [DONE]\n\n';

describe('Assistant', () => {
  beforeEach(() => {
    server.use(
      http.get('*/api/v1/assistant/conversations', () =>
        HttpResponse.json(emptyConversations),
      ),
      http.get('*/api/v1/assistant/references', () =>
        HttpResponse.json({
          data: [
            {
              id: 'doc_code_travail',
              title: 'Code du travail',
              type_code: 'CODE',
              type_name: 'Code',
            },
          ],
        }),
      ),
    );
  });

  it("affiche l'accueil de présentation (identité + promesses)", async () => {
    renderWithProviders(<Assistant />, { route: '/app/assistant' });

    expect(
      screen.getByText('Mibeko IA — votre recherche juridique, sourcée'),
    ).toBeInTheDocument();
    expect(screen.getByText('Réponses directes')).toBeInTheDocument();
    expect(screen.getByText('Chaque affirmation sourcée')).toBeInTheDocument();
    expect(screen.getByText('Recherche ciblée')).toBeInTheDocument();
  });

  it('envoie le mode et les références épinglées au backend', async () => {
    let chatBody: Record<string, unknown> | null = null;

    server.use(
      http.post('*/api/v1/assistant/chat', async ({ request }) => {
        chatBody = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(SSE_BODY, {
          headers: {
            'Content-Type': 'text/event-stream',
            'X-Conversation-Id': 'conv_1',
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<Assistant />, { route: '/app/assistant' });

    // Ouvre le sélecteur de références via le bouton « @ » du composer.
    // (la frappe « @ » est couverte par le test unitaire de ChatComposer ;
    // userEvent.type ne traverse pas les panneaux Resizable sous jsdom)
    await user.click(screen.getByTitle(/Cibler la recherche/));

    const option = await screen.findByText('Code du travail');
    await user.click(option);

    // La référence est épinglée sous forme de chip.
    expect(
      screen.getByText('Recherche ciblée', { selector: 'span' }),
    ).toBeInTheDocument();

    // Passer en mode analyse approfondie.
    await user.click(screen.getByRole('button', { name: /Analyse/ }));

    const textarea = screen.getByPlaceholderText(/Posez une question juridique/);
    fireEvent.change(textarea, {
      target: { value: 'Quel est le délai de préavis ?' },
    });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    await waitFor(() => {
      expect(chatBody).not.toBeNull();
    });

    expect(chatBody).toMatchObject({
      message: 'Quel est le délai de préavis ?',
      stream: true,
      mode: 'analysis',
      references: [{ id: 'doc_code_travail', type: 'document' }],
    });

    // La réponse streamée s'affiche.
    await waitFor(() => {
      expect(
        screen.getByText(/Le préavis est d'un mois/),
      ).toBeInTheDocument();
    });
  });

  it("charge une conversation de l'historique avec skeleton, sans requête superflue", async () => {
    let detailCalls = 0;

    server.use(
      http.get('*/api/v1/assistant/conversations', () =>
        HttpResponse.json({
          ...emptyConversations,
          data: [
            {
              id: 'conv_42',
              title: 'Préavis de licenciement',
              created_at: '2026-06-10T10:00:00Z',
              updated_at: '2026-06-10T10:05:00Z',
            },
          ],
          total: 1,
        }),
      ),
      http.get('*/api/v1/assistant/conversations/conv_42', async () => {
        detailCalls += 1;
        await delay(60);
        return HttpResponse.json({
          id: 'conv_42',
          title: 'Préavis de licenciement',
          messages: [
            {
              id: 'm1',
              role: 'user',
              content: 'Quel est le délai de préavis ?',
              meta: { references: [{ id: 'doc1', title: 'Code du travail' }] },
              created_at: '2026-06-10T10:00:00Z',
            },
            {
              id: 'm2',
              role: 'assistant',
              content: 'Le préavis est d\'un mois [1].',
              meta: { sources: [{ id: 'a1', number: '42', document_title: 'Code du travail' }] },
              created_at: '2026-06-10T10:00:30Z',
            },
          ],
        });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<Assistant />, { route: '/app/assistant' });

    // Clic sur l'item de l'historique → skeleton immédiat, le temps du fetch.
    await user.click(await screen.findByText('Préavis de licenciement'));
    expect(screen.getByTestId('conversation-skeleton')).toBeInTheDocument();

    // Les messages persistés s'affichent, avec références et sources.
    expect(
      await screen.findByText(/Le préavis est d'un mois/),
    ).toBeInTheDocument();
    // « Code du travail » apparaît en chip de référence ET en carte source.
    expect(screen.getAllByText('Code du travail').length).toBeGreaterThan(1);
    expect(screen.getByText(/1 document à consulter/)).toBeInTheDocument();
    expect(
      screen.queryByTestId('conversation-skeleton'),
    ).not.toBeInTheDocument();

    // Re-cliquer la conversation déjà ouverte ne refait aucune requête.
    await user.click(screen.getByText('Préavis de licenciement'));
    expect(screen.getByText(/Le préavis est d'un mois/)).toBeInTheDocument();
    expect(detailCalls).toBe(1);
  });

  it('affiche toujours la dernière conversation cliquée (pas de course)', async () => {
    const makeDetail = (id: string, reply: string) => ({
      id,
      title: id,
      messages: [
        {
          id: `${id}_m1`,
          role: 'user',
          content: 'Question',
          meta: null,
          created_at: '2026-06-10T10:00:00Z',
        },
        {
          id: `${id}_m2`,
          role: 'assistant',
          content: reply,
          meta: null,
          created_at: '2026-06-10T10:00:30Z',
        },
      ],
    });

    server.use(
      http.get('*/api/v1/assistant/conversations', () =>
        HttpResponse.json({
          ...emptyConversations,
          data: [
            {
              id: 'conv_slow',
              title: 'Conversation lente',
              created_at: '2026-06-10T10:00:00Z',
              updated_at: '2026-06-10T10:05:00Z',
            },
            {
              id: 'conv_fast',
              title: 'Conversation rapide',
              created_at: '2026-06-09T10:00:00Z',
              updated_at: '2026-06-09T10:05:00Z',
            },
          ],
          total: 2,
        }),
      ),
      http.get('*/api/v1/assistant/conversations/conv_slow', async () => {
        await delay(200);
        return HttpResponse.json(makeDetail('conv_slow', 'Réponse LENTE'));
      }),
      http.get('*/api/v1/assistant/conversations/conv_fast', async () => {
        await delay(20);
        return HttpResponse.json(makeDetail('conv_fast', 'Réponse RAPIDE'));
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<Assistant />, { route: '/app/assistant' });

    // Clic sur la lente puis aussitôt sur la rapide.
    await user.click(await screen.findByText('Conversation lente'));
    await user.click(screen.getByText('Conversation rapide'));

    expect(await screen.findByText('Réponse RAPIDE')).toBeInTheDocument();

    // La réponse lente arrive après coup : elle ne doit jamais remplacer
    // la conversation affichée.
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(screen.getByText('Réponse RAPIDE')).toBeInTheDocument();
    expect(screen.queryByText('Réponse LENTE')).not.toBeInTheDocument();
  });

  // mibeko-front#7 : trois états dérivés des entitlements, jamais d'un rôle.
  it('affiche le quota restant une fois le compte entamé (état « compté »)', async () => {
    server.use(
      http.get('*/api/v1/me/entitlements', () =>
        HttpResponse.json({
          success: true,
          data: {
            plan: 'libre',
            features: { assistant: true, library: true, export: false },
            quotas: { assistant: { used: 3, limit: 50, resets_at: null } },
            credits: null,
          },
        }),
      ),
    );

    renderWithProviders(<Assistant />, { route: '/app/assistant' });

    expect(await screen.findByText('47 questions restantes')).toBeInTheDocument();
    // Le composer reste disponible : l'accès n'est jamais bloqué avant l'épuisement.
    expect(screen.getByPlaceholderText(/Posez une question juridique/)).toBeInTheDocument();
  });

  it('remplace le composer par le chemin vers Pro une fois le quota épuisé, sans masquer le reste', async () => {
    server.use(
      http.get('*/api/v1/me/entitlements', () =>
        HttpResponse.json({
          success: true,
          data: {
            plan: 'libre',
            features: { assistant: true, library: true, export: false },
            quotas: {
              assistant: { used: 50, limit: 50, resets_at: '2026-10-01T00:00:00Z' },
            },
            credits: null,
          },
        }),
      ),
    );

    renderWithProviders(<Assistant />, { route: '/app/assistant' });

    expect(
      await screen.findByText('Vous avez atteint votre quota de questions.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Il se renouvelle le/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Découvrir Mibeko Pro' })).toBeInTheDocument();

    // Le composer a cédé sa place, mais le reste de la page (accueil,
    // suggestions) reste visible — « ce qui n'est pas découvert ne se vend pas ».
    expect(screen.queryByPlaceholderText(/Posez une question juridique/)).not.toBeInTheDocument();
    expect(
      screen.getByText('Mibeko IA — votre recherche juridique, sourcée'),
    ).toBeInTheDocument();
  });
});

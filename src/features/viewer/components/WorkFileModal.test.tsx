import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import WorkFileModal from './WorkFileModal';

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useParams: () => ({ id: 'doc-1' }),
}));

const SHA = 'a'.repeat(64);
const FINGERPRINT = 'f'.repeat(64);

const snapshot = {
  expected_fingerprint: FINGERPRINT,
  semantic_fingerprint: 'e'.repeat(64),
  target: {
    schema_version: 1,
    document_id: 'doc-1',
    source_pdf: { filename: 'source.pdf', sha256: SHA, size: 12 },
    nodes: [],
    articles: [
      { id: 'art-1', number: '1', parent: null, order: 1, content: 'Premier article.', source_locator: { page: 1 } },
      { id: 'art-2', number: '2', parent: null, order: 2, content: 'Second article.', source_locator: { page: 2 } },
    ],
  },
  counts: { nodes: 0, articles: 2, characters: 31 },
};

/** Proposition tronquée : le second article a disparu de la réponse. */
const propositionTronquee = {
  ...snapshot,
  target: { ...snapshot.target, articles: [snapshot.target.articles[0]] },
};

let dernierCorps: Record<string, unknown> | null = null;

function monterHandlers(articlesRetires: number) {
  server.use(
    http.get('*/api/v1/legal-documents/doc-1/extraction-snapshot', () =>
      HttpResponse.json({ success: true, data: snapshot })),
    http.post('*/api/v1/legal-documents/doc-1/replace-extraction', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      dernierCorps = body;

      return HttpResponse.json({
        success: true,
        data: {
          dry_run: !body.execute,
          executed: Boolean(body.execute),
          already_applied: false,
          plan: {
            nodes_soft_deleted: 0, nodes_target: 0,
            articles_soft_deleted: articlesRetires,
            articles_added_or_restored: 0,
            articles_reparented_and_reordered: 1,
            article_contents_updated: 0, article_locators_updated: 0, target_articles: 1,
          },
          warnings: [],
          ...(body.execute ? { actual: { articles_soft_deleted: articlesRetires } } : {}),
        },
      });
    }),
  );
}

async function deposer(contenu: unknown) {
  const fichier = new File([JSON.stringify(contenu)], 'proposition.json', { type: 'application/json' });
  await userEvent.upload(screen.getByLabelText(/Déposer la proposition corrigée/i), fichier);
}

describe('WorkFileModal', () => {
  beforeEach(() => {
    dernierCorps = null;
    useViewerStore.setState({ workFileModalOpen: true });
  });

  it('refuse d appliquer une proposition qui retire des articles tant que le nombre n est pas recopié', async () => {
    monterHandlers(1);
    renderWithProviders(<WorkFileModal document={{ id: 'doc-1', titre_officiel: 'Code de test' } as never} />);

    await deposer(propositionTronquee);

    // La disparition ne se lit pas comme une ligne parmi d'autres.
    expect(await screen.findByText(/1 article disparaîtrait du document/i)).toBeInTheDocument();

    const appliquer = screen.getByRole('button', { name: /Appliquer la proposition/i });
    expect(appliquer).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText(/Motif de la correction/i),
      'Structure reconstruite contre le PDF source officiel.',
    );
    expect(appliquer).toBeDisabled();

    // Un nombre faux ne vaut pas confirmation.
    await userEvent.type(screen.getByLabelText(/Nombre d’articles retirés/i), '3');
    expect(appliquer).toBeDisabled();

    await userEvent.clear(screen.getByLabelText(/Nombre d’articles retirés/i));
    await userEvent.type(screen.getByLabelText(/Nombre d’articles retirés/i), '1');
    await waitFor(() => expect(appliquer).toBeEnabled());

    await userEvent.click(appliquer);

    await waitFor(() => expect(dernierCorps?.execute).toBe(true));
    expect(dernierCorps?.confirm_deletions).toBe(1);
    expect(dernierCorps?.expected_fingerprint).toBe(FINGERPRINT);
  });

  it('refuse un fichier qui vise un autre document, sans appeler le serveur', async () => {
    monterHandlers(0);
    renderWithProviders(<WorkFileModal document={{ id: 'doc-1', titre_officiel: 'Code de test' } as never} />);

    await deposer({ ...snapshot.target, document_id: 'doc-2' });

    expect(await screen.findByText(/appartient à un autre document/i)).toBeInTheDocument();
    expect(dernierCorps).toBeNull();
  });

  it('refuse un fichier dont le PDF de référence diffère', async () => {
    monterHandlers(0);
    renderWithProviders(<WorkFileModal document={{ id: 'doc-1', titre_officiel: 'Code de test' } as never} />);

    await deposer({ ...snapshot.target, source_pdf: { sha256: 'b'.repeat(64) } });

    expect(await screen.findByText(/PDF de référence/i)).toBeInTheDocument();
    expect(dernierCorps).toBeNull();
  });
});

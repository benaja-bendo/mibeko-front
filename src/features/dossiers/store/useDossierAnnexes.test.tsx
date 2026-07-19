import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import { useDossier, useDossiers } from '../hooks/useDossiers';
import { useDossierAnnexes } from './useDossierAnnexes';

/** Dossier serveur minimal, annexes vides par défaut. */
function apiDossier(overrides: Record<string, unknown> = {}) {
  return {
    id: 'd1',
    type: 'contentieux',
    title: 'Dossier test',
    reference: null,
    client: null,
    client_role: null,
    adverse: null,
    jurisdiction: null,
    nature: null,
    matiere: null,
    status: 'ouvert',
    description: null,
    color: null,
    echeances: [],
    references: [],
    pieces: [],
    documents: [],
    created_at: '2026-07-03T00:00:00Z',
    updated_at: '2026-07-03T00:00:00Z',
    ...overrides,
  };
}

/** Harnais : charge la liste et expose des boutons pilotant chaque mutation. */
function Harness() {
  const { isSuccess } = useDossiers();
  const dossier = useDossier('d1');
  const annexes = useDossierAnnexes();

  if (!isSuccess || !dossier) return <div>chargement…</div>;

  return (
    <div>
      <p>refs:{dossier.references.length}</p>
      <p>pieces:{dossier.pieces.length}</p>
      <p>docs:{dossier.documents.length}</p>

      <button
        onClick={() =>
          annexes.addReference('d1', {
            id: 'art-1',
            type: 'article',
            title: 'Code du travail',
            number: '62',
          })
        }
      >
        add-ref
      </button>
      <button onClick={() => annexes.removeReference('d1', 'art-1')}>
        remove-ref
      </button>

      <button
        onClick={() =>
          annexes.addPiece('d1', {
            name: 'assignation.pdf',
            size: 1024,
            mime: 'application/pdf',
          })
        }
      >
        add-piece
      </button>
      <button
        onClick={() => annexes.removePiece('d1', dossier.pieces[0]?.id ?? '')}
      >
        remove-piece
      </button>

      <button
        onClick={() =>
          annexes.addDocument('d1', {
            templateId: 'mise-en-demeure',
            templateName: 'Mise en demeure',
            title: 'MED — Société X',
            html: '<p>…</p>',
          })
        }
      >
        add-doc
      </button>
      <button
        onClick={() =>
          annexes.removeDocument('d1', dossier.documents[0]?.id ?? '')
        }
      >
        remove-doc
      </button>
    </div>
  );
}

/** État serveur mutable partagé par les handlers d'un test. */
let store: {
  references: Record<string, unknown>[];
  pieces: Record<string, unknown>[];
  documents: Record<string, unknown>[];
};

let rowSeq: number;

beforeEach(() => {
  store = { references: [], pieces: [], documents: [] };
  rowSeq = 0;

  server.use(
    http.get('*/api/v1/dossiers', () =>
      HttpResponse.json({
        success: true,
        data: [
          apiDossier({
            references: store.references,
            pieces: store.pieces,
            documents: store.documents,
          }),
        ],
      }),
    ),

    // Références : la Resource backend expose `id` = UUID cible (target_id) et
    // déduplique par cette cible ; pas d'id de ligne séparé, pas de `ref_id`.
    http.post('*/api/v1/dossiers/:id/references', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const existing = store.references.find((r) => r.id === body.id);
      const row = existing ?? {
        id: body.id,
        type: body.type,
        title: body.title,
        breadcrumb: body.breadcrumb ?? null,
        number: body.number ?? null,
        note: body.note ?? null,
      };
      if (!existing) store.references.push(row);
      return HttpResponse.json({ success: true, data: row });
    }),
    http.delete('*/api/v1/dossiers/:id/references/:target', ({ params }) => {
      store.references = store.references.filter((r) => r.id !== params.target);
      return HttpResponse.json({ success: true, data: null });
    }),

    http.post('*/api/v1/dossiers/:id/pieces', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const row = {
        id: `piece-${++rowSeq}`,
        name: body.name,
        size: body.size,
        mime: body.mime,
        note: body.note ?? null,
        added_at: '2026-07-03T00:00:00Z',
      };
      store.pieces.push(row);
      return HttpResponse.json({ success: true, data: row });
    }),
    http.delete('*/api/v1/dossiers/:id/pieces/:pieceId', ({ params }) => {
      store.pieces = store.pieces.filter((p) => p.id !== params.pieceId);
      return HttpResponse.json({ success: true, data: null });
    }),

    http.post('*/api/v1/dossiers/:id/documents', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const row = {
        id: `doc-${++rowSeq}`,
        template_id: body.template_id,
        template_name: body.template_name,
        title: body.title,
        html: body.html,
        created_at: '2026-07-03T00:00:00Z',
      };
      store.documents.push(row);
      return HttpResponse.json({ success: true, data: row });
    }),
    http.delete('*/api/v1/dossiers/:id/documents/:docId', ({ params }) => {
      store.documents = store.documents.filter((d) => d.id !== params.docId);
      return HttpResponse.json({ success: true, data: null });
    }),
  );
});

it('ajoute puis retire une référence', async () => {
  const user = userEvent.setup();
  renderWithProviders(<Harness />);

  await screen.findByText('refs:0');
  await user.click(screen.getByRole('button', { name: 'add-ref' }));

  // Mise à jour optimiste immédiate, confirmée après réconciliation serveur.
  await screen.findByText('refs:1');
  await waitFor(() => expect(store.references).toHaveLength(1));

  await user.click(screen.getByRole('button', { name: 'remove-ref' }));
  await screen.findByText('refs:0');
  await waitFor(() => expect(store.references).toHaveLength(0));
});

it('déduplique une référence ajoutée deux fois', async () => {
  const user = userEvent.setup();
  renderWithProviders(<Harness />);

  await screen.findByText('refs:0');
  await user.click(screen.getByRole('button', { name: 'add-ref' }));
  await screen.findByText('refs:1');
  await waitFor(() => expect(store.references).toHaveLength(1));

  // Second ajout du même article : ni doublon optimiste, ni doublon serveur.
  await user.click(screen.getByRole('button', { name: 'add-ref' }));
  await waitFor(() => expect(store.references).toHaveLength(1));
  expect(screen.getByText('refs:1')).toBeInTheDocument();
});

it('ajoute puis retire une pièce (métadonnées, id serveur)', async () => {
  const user = userEvent.setup();
  renderWithProviders(<Harness />);

  await screen.findByText('pieces:0');
  await user.click(screen.getByRole('button', { name: 'add-piece' }));
  await screen.findByText('pieces:1');
  await waitFor(() => expect(store.pieces).toHaveLength(1));
  expect(store.pieces[0]).toMatchObject({ name: 'assignation.pdf', size: 1024 });

  await user.click(screen.getByRole('button', { name: 'remove-piece' }));
  await screen.findByText('pieces:0');
  await waitFor(() => expect(store.pieces).toHaveLength(0));
});

it('ajoute puis retire un document généré (id serveur)', async () => {
  const user = userEvent.setup();
  renderWithProviders(<Harness />);

  await screen.findByText('docs:0');
  await user.click(screen.getByRole('button', { name: 'add-doc' }));
  await screen.findByText('docs:1');
  await waitFor(() => expect(store.documents).toHaveLength(1));

  await user.click(screen.getByRole('button', { name: 'remove-doc' }));
  await screen.findByText('docs:0');
  await waitFor(() => expect(store.documents).toHaveLength(0));
});

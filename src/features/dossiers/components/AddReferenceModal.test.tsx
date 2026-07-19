import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import AddReferenceModal from './AddReferenceModal';

/** Dossier serveur minimal (cœur + annexes vides) pour la liste. */
function apiDossier(references: unknown[] = []) {
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
    references,
    pieces: [],
    documents: [],
    created_at: '2026-07-03T00:00:00Z',
    updated_at: '2026-07-03T00:00:00Z',
  };
}

const searchHandler = http.get('*/api/v1/library/search', () =>
  HttpResponse.json({
    success: true,
    data: [
      {
        id: 'art-1',
        number: '62',
        content: 'Rupture du contrat de travail…',
        document_id: 'doc-1',
        document_title: 'Code du travail',
        breadcrumb: 'Code du travail › Titre IV › Chapitre 2',
        legal_scope: 'national',
        institution: null,
        date_publication: null,
        score: 1,
      },
    ],
    pagination: { current_page: 1, last_page: 1, per_page: 8, total: 1 },
  }),
);

it('recherche et rattache un article sans quitter le dossier', async () => {
  const user = userEvent.setup();

  let posted: Record<string, unknown> | null = null;
  const references: Record<string, unknown>[] = [];

  server.use(
    searchHandler,
    // La liste reflète l'état serveur (références remontées après POST).
    http.get('*/api/v1/dossiers', () =>
      HttpResponse.json({ success: true, data: [apiDossier(references)] }),
    ),
    http.post('*/api/v1/dossiers/:id/references', async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>;
      const row = {
        id: posted.id,
        type: posted.type,
        title: posted.title,
        breadcrumb: posted.breadcrumb ?? null,
        number: posted.number ?? null,
        note: posted.note ?? null,
      };
      references.push(row);
      return HttpResponse.json({ success: true, data: row });
    }),
  );

  renderWithProviders(
    <AddReferenceModal open dossierId="d1" onOpenChange={() => {}} />,
  );

  await user.type(
    screen.getByPlaceholderText(/Rechercher un article/i),
    'travail',
  );

  // Le résultat apparaît dans le panneau, sans navigation.
  await screen.findByText('Code du travail · Art. 62');

  await user.click(screen.getByRole('button', { name: 'Ajouter' }));

  // Retour visuel immédiat (mise à jour optimiste) + POST au serveur.
  await screen.findByText('Ajouté');
  await waitFor(() =>
    // Le contrat exige l'UUID de l'article (`id`) comme clé de déduplication.
    expect(posted).toMatchObject({ id: 'art-1', type: 'article' }),
  );
});

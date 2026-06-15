import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import { useDossierAnnexes } from '../store/useDossierAnnexes';
import AddReferenceModal from './AddReferenceModal';

beforeEach(() => {
  useDossierAnnexes.setState({ byId: {} });
});

it('recherche et rattache un article sans quitter le dossier', async () => {
  const user = userEvent.setup();

  server.use(
    http.get('*/api/v1/library/search', () =>
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
    ),
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

  // Retour visuel immédiat + référence enregistrée dans le dossier.
  await screen.findByText('Ajouté');
  await waitFor(() =>
    expect(useDossierAnnexes.getState().byId['d1']?.references).toHaveLength(1),
  );
});

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import { AVerifierZone } from './AVerifierZone';
import type { PythonDocumentSummary } from '../api/pythonApi';

function docSummary(overrides: Partial<PythonDocumentSummary> & { id: string; titre_officiel: string }): PythonDocumentSummary {
  return {
    document_role: 'FLUX',
    curation_status: 'draft',
    extraction_status: 'completed',
    latest_run_status: 'completed',
    has_md: true,
    has_json: true,
    ...overrides,
  };
}

function mockDocuments(docs: PythonDocumentSummary[]) {
  // `VITE_PYTHON_API_URL` (.env) pointe directement sur l'API Python
  // (`http://localhost:8001/api/v1`) — le préfixe `/py` du proxy Vite n'entre
  // en jeu que quand cette variable est absente (voir CLAUDE.md racine).
  server.use(http.get('*/api/v1/documents', () => HttpResponse.json(docs)));
}

// Le panneau se monte réellement à la sélection : lui donner des réponses
// neutres évite de dépendre de son détail dans un test qui ne teste que la
// liste et la sélection.
function mockEmptyPanelData(documentId: string) {
  server.use(
    http.get(`*/api/v1/legal-documents/${documentId}/curation-flags`, () => HttpResponse.json({ data: [] })),
    http.get(`*/api/v1/legal-documents/${documentId}/relecture`, () =>
      HttpResponse.json({
        data: {
          document_controle_run_id: null,
          version_jeu: null,
          resultat: null,
          points_obligatoires: [],
          sondage_articles: [],
          preuve_existante: false,
        },
      })
    )
  );
}

describe('AVerifierZone', () => {
  it('affiche l’état vide quand aucun document n’est à vérifier', async () => {
    mockDocuments([]);

    renderWithProviders(<AVerifierZone />);

    await waitFor(() => {
      expect(screen.getByText('Aucun document à vérifier.')).toBeInTheDocument();
    });
  });

  it('écarte les documents dont l’extraction est encore en cours', async () => {
    mockDocuments([
      docSummary({ id: 'd1', titre_officiel: 'Loi stable' }),
      docSummary({ id: 'd2', titre_officiel: 'Loi en extraction', extraction_status: 'processing' }),
      docSummary({ id: 'd3', titre_officiel: 'Loi en cours de run', latest_run_status: 'running' }),
    ]);

    renderWithProviders(<AVerifierZone />);

    await waitFor(() => {
      expect(screen.getByText('Loi stable')).toBeInTheDocument();
    });
    expect(screen.queryByText('Loi en extraction')).not.toBeInTheDocument();
    expect(screen.queryByText('Loi en cours de run')).not.toBeInTheDocument();
  });

  it('sélectionne un document et affiche son panneau de relecture', async () => {
    const user = userEvent.setup();
    mockDocuments([docSummary({ id: 'd1', titre_officiel: 'Loi stable' })]);
    mockEmptyPanelData('d1');

    renderWithProviders(<AVerifierZone />);

    expect(screen.getByText('Sélectionnez un document à vérifier.')).toBeInTheDocument();

    await waitFor(() => screen.getByText('Loi stable'));
    await user.click(screen.getByText('Loi stable'));

    await waitFor(() => {
      expect(screen.queryByText('Sélectionnez un document à vérifier.')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Contrôlé, 0 réserve ouverte')).toBeInTheDocument();
  });
});

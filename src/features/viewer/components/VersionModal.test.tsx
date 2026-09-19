import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import type { TreeNode } from '@/shared/types/database';
import VersionModal from './VersionModal';

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useParams: () => ({ id: 'doc-1' }),
}));

const ARTICLE: TreeNode = {
  id: 'art-1',
  parent_id: null,
  type: 'ARTICLE',
  numero: '3',
  label: null,
  sort_order: 0,
  vs: 'ok',
  content: 'Texte en vigueur.',
  versions: [
    { id: 'v1', date: '2026-08-01', created_at: '2026-08-01', type: 'modification', title: '', author: '', contenu_texte: 'Ancien texte.' },
    { id: 'v0', date: '2026-01-10', created_at: '2026-01-10', type: 'creation', title: '', author: '', contenu_texte: 'Texte initial.', modifie_par_document_id: 'doc-modif', modifie_par_document_titre: 'Décret n° 2026-1 du 10 janvier 2026.' },
  ],
};

/**
 * Amendement (dashboard#166) : `modifie_par_document_id` est obligatoire côté
 * API depuis que `ArticleController::update()` ne fork plus jamais de version.
 * Ce test verrouille le fait que le front l'exige AUSSI avant de soumettre —
 * sinon l'éditeur ne découvre le 422 qu'après avoir rédigé tout l'amendement.
 */
function ouvrirFormulaire() {
  useViewerStore.setState({ versionModalOpen: true, selectedNode: ARTICLE, versionFilter: 'all' });
}

afterEach(() => {
  useViewerStore.setState({ versionModalOpen: false, selectedNode: null, versionFilter: 'all' });
});

it('affiche le texte modificateur des versions qui en portent un, et son absence pour les autres', () => {
  ouvrirFormulaire();
  renderWithProviders(<VersionModal />);

  expect(screen.getByText(/modifié par : Décret n° 2026-1 du 10 janvier 2026\./)).toBeInTheDocument();
  expect(screen.getByText('Aucun texte modificateur identifié')).toBeInTheDocument();
});

it('bloque l\'enregistrement d\'un amendement tant qu\'aucun texte modificateur n\'est sélectionné', async () => {
  const user = userEvent.setup();
  ouvrirFormulaire();
  renderWithProviders(<VersionModal />);

  await user.click(screen.getByRole('button', { name: 'Commencer' }));

  const submit = screen.getByRole('button', { name: /Enregistrer l'amendement/ });
  expect(submit).toBeDisabled();
});

it('ne propose que des documents (pas des articles) comme texte modificateur, puis débloque la soumission', async () => {
  const user = userEvent.setup();
  server.use(
    http.get('*/api/v1/relations/search', () => HttpResponse.json({
      data: [
        { id: 'art-9', label: 'Art. 9 - Un autre texte', type: 'ARTICLE' },
        { id: 'doc-modif', label: 'Décret n° 2026-1 du 10 janvier 2026.', type: 'DOCUMENT' },
      ],
    })),
  );

  ouvrirFormulaire();
  renderWithProviders(<VersionModal />);
  await user.click(screen.getByRole('button', { name: 'Commencer' }));

  await user.type(screen.getByPlaceholderText('Rechercher le texte qui modifie…'), 'Décret 2026-1');
  await user.click(screen.getByRole('button', { name: 'Chercher' }));

  expect(await screen.findByText('Décret n° 2026-1 du 10 janvier 2026.')).toBeInTheDocument();
  expect(screen.queryByText('Art. 9 - Un autre texte')).not.toBeInTheDocument();

  await user.click(screen.getByText('Décret n° 2026-1 du 10 janvier 2026.'));

  const submit = screen.getByRole('button', { name: /Enregistrer l'amendement/ });
  await waitFor(() => expect(submit).toBeEnabled());
});

it('envoie modifie_par_document_id dans la requête d\'amendement', async () => {
  const user = userEvent.setup();
  let corpsEnvoye: Record<string, unknown> | null = null;

  server.use(
    http.get('*/api/v1/relations/search', () => HttpResponse.json({
      data: [{ id: 'doc-modif', label: 'Décret n° 2026-1 du 10 janvier 2026.', type: 'DOCUMENT' }],
    })),
    http.post('*/api/v1/articles/art-1/versions', async ({ request }) => {
      corpsEnvoye = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ success: true, data: {} });
    }),
  );

  ouvrirFormulaire();
  renderWithProviders(<VersionModal />);
  await user.click(screen.getByRole('button', { name: 'Commencer' }));

  await user.type(screen.getByPlaceholderText('Rechercher le texte qui modifie…'), 'Décret 2026-1');
  await user.click(screen.getByRole('button', { name: 'Chercher' }));
  await user.click(await screen.findByText('Décret n° 2026-1 du 10 janvier 2026.'));

  await user.click(screen.getByRole('button', { name: /Enregistrer l'amendement/ }));

  await waitFor(() => expect(corpsEnvoye).not.toBeNull());
  expect(corpsEnvoye).toMatchObject({ modifie_par_document_id: 'doc-modif' });
});

it('affiche le message d\'erreur renvoyé par l\'API quand l\'amendement est refusé (422)', async () => {
  const user = userEvent.setup();

  server.use(
    http.get('*/api/v1/relations/search', () => HttpResponse.json({
      data: [{ id: 'doc-modif', label: 'Décret n° 2026-1 du 10 janvier 2026.', type: 'DOCUMENT' }],
    })),
    http.post('*/api/v1/articles/art-1/versions', () => HttpResponse.json({
      success: false,
      message: 'Cette date d\'effet précède la version la plus récente déjà enregistrée.',
    }, { status: 422 })),
  );

  ouvrirFormulaire();
  renderWithProviders(<VersionModal />);
  await user.click(screen.getByRole('button', { name: 'Commencer' }));

  await user.type(screen.getByPlaceholderText('Rechercher le texte qui modifie…'), 'Décret 2026-1');
  await user.click(screen.getByRole('button', { name: 'Chercher' }));
  await user.click(await screen.findByText('Décret n° 2026-1 du 10 janvier 2026.'));
  await user.click(screen.getByRole('button', { name: /Enregistrer l'amendement/ }));

  expect(await screen.findByText(/précède la version la plus récente/)).toBeInTheDocument();
});

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import type { LegalDocument } from '@/shared/types/database';
import PublishModal from './PublishModal';

const publie = {
  id: 'doc-1',
  titre_officiel: 'Code civil',
  curation_status: 'published',
  date_entree_vigueur: '1960-08-15',
} as unknown as LegalDocument;

function ouvrir(document: LegalDocument) {
  useViewerStore.getState().setPublishModalOpen(true);
  renderWithProviders(
    <Routes>
      <Route path="/editor/:id" element={<PublishModal document={document} />} />
    </Routes>,
    { route: '/editor/doc-1' },
  );
}

// mibeko-front#64 : l'API refuse une dépublication sans motif.
it('exige un motif avant de retirer un document publié, puis l\'envoie', async () => {
  let corps: Record<string, unknown> | null = null;
  server.use(
    http.patch('*/api/v1/legal-documents/doc-1', async ({ request }) => {
      corps = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ data: { id: 'doc-1', curation_status: 'review' } });
    }),
  );
  ouvrir(publie);
  const user = userEvent.setup();

  const retirer = screen.getByRole('button', { name: 'Retirer de la publication' });
  expect(retirer).toBeDisabled();

  await user.type(screen.getByLabelText('Motif du retrait'), 'court');
  expect(retirer).toBeDisabled();

  await user.type(screen.getByLabelText('Motif du retrait'), ' : édition française de 2012 (D-058)');
  expect(retirer).toBeEnabled();
  await user.click(retirer);

  await waitFor(() => expect(corps).not.toBeNull());
  expect(corps).toEqual({
    curation_status: 'review',
    motif: 'court : édition française de 2012 (D-058)',
  });
});

it('affiche le refus de l\'API si le retrait échoue', async () => {
  server.use(
    http.patch('*/api/v1/legal-documents/doc-1', () =>
      HttpResponse.json(
        { message: 'Dépublication réservée aux administrateurs, avec un motif obligatoire.' },
        { status: 422 },
      ),
    ),
  );
  ouvrir(publie);
  const user = userEvent.setup();

  await user.type(screen.getByLabelText('Motif du retrait'), 'Motif suffisamment long');
  await user.click(screen.getByRole('button', { name: 'Retirer de la publication' }));

  expect(await screen.findByText(/réservée aux administrateurs/)).toBeInTheDocument();
});

it('ne demande pas de motif pour publier un document en révision', () => {
  ouvrir({ ...publie, curation_status: 'review' } as LegalDocument);

  expect(screen.queryByLabelText('Motif du retrait')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Publier maintenant' })).toBeEnabled();
});

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import NewDossierModal from './NewDossierModal';

/** Enregistrement minimal renvoyé par l'API à la création. */
function recordResponse(body: Record<string, unknown>) {
  return {
    success: true,
    data: {
      id: 'new-id',
      type: body.type,
      title: body.title,
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
      created_at: '2026-06-15T00:00:00Z',
      updated_at: '2026-06-15T00:00:00Z',
    },
  };
}

it('adapte les champs et les échéances suggérées au type choisi', async () => {
  const user = userEvent.setup();
  renderWithProviders(
    <NewDossierModal open onOpenChange={() => {}} />,
  );

  // Par défaut : contentieux → partie adverse + délai d'appel.
  expect(screen.getByLabelText(/Partie adverse/i)).toBeInTheDocument();
  expect(screen.getByText("Délai d'appel")).toBeInTheDocument();
  expect(screen.queryByText('Dépôt RCCM')).not.toBeInTheDocument();

  // Bascule en conseil → nature à la place de l'adverse, autres préréglages.
  await user.click(screen.getByRole('button', { name: /Conseil/i }));

  expect(screen.getByLabelText(/Nature du dossier/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/Partie adverse/i)).not.toBeInTheDocument();
  expect(screen.getByText('Dépôt RCCM')).toBeInTheDocument();
  expect(screen.queryByText("Délai d'appel")).not.toBeInTheDocument();
});

it('crée le dossier avec son type et ses échéances cochées', async () => {
  const user = userEvent.setup();
  const onCreated = vi.fn();
  let body: Record<string, unknown> | null = null;

  server.use(
    http.post('*/api/v1/dossiers', async ({ request }) => {
      body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(recordResponse(body));
    }),
  );

  renderWithProviders(
    <NewDossierModal open onOpenChange={() => {}} onCreated={onCreated} />,
  );

  await user.type(screen.getByLabelText(/Objet du litige/i), 'Licenciement abusif');
  await user.click(screen.getByRole('button', { name: /Créer le dossier/i }));

  await waitFor(() => expect(onCreated).toHaveBeenCalledWith('new-id'));

  expect(body).toMatchObject({ type: 'contentieux', title: 'Licenciement abusif' });
  expect(
    (body!.echeances as Array<{ title: string }>).map((e) => e.title),
  ).toEqual(['Audience', "Délai d'appel"]);
});

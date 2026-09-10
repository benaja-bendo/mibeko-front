import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import Messages from './Messages';

const contact = { id: 'message-1', name: 'Awa', email: 'awa@example.cg', profile: 'professionnel', message: 'Je souhaite une démonstration.', handled: false, created_at: '2026-09-09T12:00:00Z', account: { id: 'user-1', name: 'Awa' } };
const pagination = { current_page: 1, last_page: 1, total: 1 };

it('lit le message, ouvre le compte et actualise la file et le compteur après traitement', async () => {
  let handled = false;
  server.use(
    http.get('*/api/v1/admin/messages', ({ request }) => {
      const filter = new URL(request.url).searchParams.get('handled');
      const data = filter === String(Number(handled)) ? [{ ...contact, handled }] : [];
      return HttpResponse.json({ data, pagination: { ...pagination, total: data.length } });
    }),
    http.patch('*/api/v1/admin/messages/message-1', async ({ request }) => {
      handled = (await request.json() as { handled: boolean }).handled;
      return HttpResponse.json({ data: { id: contact.id, handled } });
    }),
  );
  const { queryClient } = renderWithProviders(<Messages />);
  queryClient.setQueryData(['admin', 'overview'], { attention: { unhandled_contacts: 1 } });
  expect(await screen.findByText(contact.message)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Compte existant : Awa' })).toHaveAttribute('href', '/admin/utilisateurs?focus=user-1');
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Marquer traité' }));
  expect(await screen.findByText('Aucun message dans cette vue.')).toBeInTheDocument();
  expect(queryClient.getQueryState(['admin', 'overview'])?.isInvalidated).toBe(true);
  await user.selectOptions(screen.getByLabelText('Statut des messages'), 'handled');
  expect(await screen.findByText(contact.message)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Remettre à traiter' }));
  await waitFor(() => expect(handled).toBe(false));
  expect(await screen.findByText('Aucun message dans cette vue.')).toBeInTheDocument();
});

it('garde le message en attente si la mise à jour échoue et permet de réessayer la lecture', async () => {
  let fail = true;
  server.use(
    http.get('*/api/v1/admin/messages', () => fail ? HttpResponse.json({ message: 'Lecture indisponible' }, { status: 500 }) : HttpResponse.json({ data: [contact], pagination })),
    http.patch('*/api/v1/admin/messages/message-1', () => HttpResponse.json({ message: 'Modification indisponible' }, { status: 500 })),
  );
  renderWithProviders(<Messages />);
  expect(await screen.findByText('Lecture indisponible')).toBeInTheDocument();
  fail = false;
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Réessayer la liste' }));
  await user.click(await screen.findByRole('button', { name: 'Marquer traité' }));
  expect(await screen.findByText(/Le statut n’a pas été modifié/)).toBeInTheDocument();
  expect(screen.getByText(contact.message)).toBeInTheDocument();
});

it('pagine la newsletter et signale un échec de l’export complet', async () => {
  let exported = false;
  server.use(
    http.get('*/api/v1/admin/messages', () => HttpResponse.json({ data: [], pagination: { ...pagination, total: 0 } })),
    http.get('*/api/v1/admin/newsletter-subscriptions', ({ request }) => {
      const page = new URL(request.url).searchParams.get('page');
      return HttpResponse.json({ data: [{ id: page, email: `abonne${page}@example.cg`, source: 'site', created_at: contact.created_at }], pagination: { current_page: Number(page), last_page: 2, total: 21 } });
    }),
    http.get('*/api/v1/admin/newsletter-subscriptions/export', () => { exported = true; return HttpResponse.json({ message: 'Export indisponible' }, { status: 500 }); }),
  );
  renderWithProviders(<Messages />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Abonnés newsletter' }));
  expect(await screen.findByText('abonne1@example.cg')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Suivant' }));
  expect(await screen.findByText('abonne2@example.cg')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Exporter tous les abonnés en CSV' }));
  expect(await screen.findByText(/L’export a échoué/)).toBeInTheDocument();
  expect(exported).toBe(true);
});


it('télécharge le CSV reçu de l’API avec un nom de fichier explicite', async () => {
  server.use(
    http.get('*/api/v1/admin/messages', () => HttpResponse.json({ data: [], pagination })),
    http.get('*/api/v1/admin/newsletter-subscriptions', () => HttpResponse.json({ data: [], pagination })),
    http.get('*/api/v1/admin/newsletter-subscriptions/export', () => new HttpResponse('E-mail;Source\nawa@example.cg;site', { headers: { 'Content-Type': 'text/csv' } })),
  );
  const createUrl = vi.fn(() => 'blob:newsletter-recette');
  const revokeUrl = vi.fn();
  vi.stubGlobal('URL', class extends URL { static createObjectURL = createUrl; static revokeObjectURL = revokeUrl; });
  const clicked: { href?: string; download?: string } = {};
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.href = this.href;
    clicked.download = this.download;
  });
  try {
    renderWithProviders(<Messages />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Abonnés newsletter' }));
    await user.click(screen.getByRole('button', { name: 'Exporter tous les abonnés en CSV' }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(createUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(clicked.href).toBe('blob:newsletter-recette');
    expect(clicked.download).toMatch(/^abonnes-newsletter-\d{4}-\d{2}-\d{2}\.csv$/);
    await waitFor(() => expect(revokeUrl).toHaveBeenCalledWith('blob:newsletter-recette'), { timeout: 2500 });
  } finally {
    click.mockRestore();
    vi.unstubAllGlobals();
  }
});

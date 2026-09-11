import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render';
import ChatMessage from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '../types';

/**
 * mibeko-dashboard#15 : une réponse sans texte trouvé doit se lire comme une
 * non-réponse assumée, jamais comme une réponse ordinaire mais courte.
 */
const reponse = (extra: Partial<ChatMessageType> = {}): ChatMessageType => ({
  id: 'm1',
  role: 'assistant',
  content: 'Le corpus Mibeko ne contient pas ce texte.',
  ...extra,
});

describe('ChatMessage — état « aucune réponse »', () => {
  it('affiche l\'état et une suite proposée quand le corpus n\'a rien rendu', () => {
    renderWithProviders(<ChatMessage message={reponse({ noResult: true })} />);

    expect(
      screen.getByText(/Aucun extrait pertinent trouvé pour cette recherche/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Parcourir la Bibliothèque' }),
    ).toBeInTheDocument();
  });

  it('n\'affiche rien de tel pour une réponse ordinaire', () => {
    renderWithProviders(<ChatMessage message={reponse()} />);

    expect(
      screen.queryByText(/Aucun extrait pertinent/),
    ).not.toBeInTheDocument();
  });

  it('n\'affiche pas l\'état tant que la réponse est en cours', () => {
    // Le flux émet `no_result` avant la fin : l'annoncer pendant que le texte
    // arrive encore ferait clignoter un verdict prématuré.
    renderWithProviders(
      <ChatMessage message={reponse({ noResult: true, pending: true })} />,
    );

    expect(
      screen.queryByText(/Aucun extrait pertinent/),
    ).not.toBeInTheDocument();
  });
});

it('offers retry for a failed reply and retains the explanation', async () => {
  const onRetry = vi.fn();
  renderWithProviders(<ChatMessage message={reponse({ error: true, content: '', errorMessage: 'Le service a été interrompu.' })} onRetry={onRetry} />);
  expect(screen.getByText('Réponse interrompue')).toBeInTheDocument();
  expect(screen.getByText('Le service a été interrompu.')).toBeInTheDocument();
  screen.getByRole('button', { name: 'Réessayer la question' }).click();
  expect(onRetry).toHaveBeenCalledTimes(1);
});

const sources = [
  { id: 'a1', document_id: 'd1', document_title: 'Texte non cité', content: 'Extrait non cité' },
  { id: 'a2', document_id: 'd2', document_title: 'Texte cité', content: 'Extrait cité' },
];

it('attend la fin du texte puis propose uniquement les sources citées dans un bloc replié', async () => {
  const user = userEvent.setup();
  const message = reponse({ content: '', pending: true, sources });
  const view = renderWithProviders(<ChatMessage message={message} status="Recherche des textes applicables…" />);
  expect(screen.getByText('Recherche des textes applicables…')).toBeVisible();
  expect(screen.queryByText(/Sources citées/)).not.toBeInTheDocument();
  expect(screen.queryByText('Extrait cité')).not.toBeInTheDocument();

  view.rerender(<ChatMessage message={{ ...message, content: 'Une réponse [2].' }} />);
  expect(screen.getByTitle('Source 2')).toBeVisible();
  expect(screen.queryByText(/Sources citées/)).not.toBeInTheDocument();

  view.rerender(<ChatMessage message={{ ...message, content: 'Une réponse [2].', pending: false }} />);
  const summary = screen.getByText('Sources citées (1)');
  expect(summary).toBeVisible();
  expect(summary.closest('details')).not.toHaveAttribute('open');
  expect(screen.getByText('Extrait cité')).not.toBeVisible();
  await user.click(summary);
  expect(screen.getByText('Extrait cité')).toBeVisible();
  expect(screen.queryByText('Extrait non cité')).not.toBeInTheDocument();
  // La seconde source conserve son numéro, même si la première n'est pas citée.
  expect(screen.getAllByText('2')).toHaveLength(2);
  await user.click(summary);
  expect(screen.getByText('Extrait cité')).not.toBeVisible();
});

it('ouvre un article depuis sa citation pendant la rédaction', async () => {
  function Location() {
    const location = useLocation();
    return <output>{location.pathname}{location.search}</output>;
  }
  renderWithProviders(<><ChatMessage message={reponse({ content: 'Une réponse [2].', pending: true, sources })} /><Location /></>);
  await userEvent.setup().click(screen.getByTitle('Source 2'));
  expect(screen.getByText('/app/library?doc=d2&article=a2')).toBeInTheDocument();
});

it.each([{ error: true }, { interrupted: true }])('ne présente pas un échec comme une réponse sourcée terminée (%j)', (state) => {
  renderWithProviders(<ChatMessage message={reponse({ content: 'Début [2].', sources, ...state })} />);
  expect(screen.queryByText(/Sources citées/)).not.toBeInTheDocument();
  expect(screen.queryByText('Extrait cité')).not.toBeInTheDocument();
});

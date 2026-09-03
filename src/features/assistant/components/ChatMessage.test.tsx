import { screen } from '@testing-library/react';
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
      screen.getByText(/Aucun texte du corpus Mibeko ne répond à cette question/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Parcourir la Bibliothèque' }),
    ).toBeInTheDocument();
  });

  it('n\'affiche rien de tel pour une réponse ordinaire', () => {
    renderWithProviders(<ChatMessage message={reponse()} />);

    expect(
      screen.queryByText(/Aucun texte du corpus Mibeko/),
    ).not.toBeInTheDocument();
  });

  it('n\'affiche pas l\'état tant que la réponse est en cours', () => {
    // Le flux émet `no_result` avant la fin : l'annoncer pendant que le texte
    // arrive encore ferait clignoter un verdict prématuré.
    renderWithProviders(
      <ChatMessage message={reponse({ noResult: true, pending: true })} />,
    );

    expect(
      screen.queryByText(/Aucun texte du corpus Mibeko/),
    ).not.toBeInTheDocument();
  });
});

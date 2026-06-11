import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import LibrarySearchBar from './LibrarySearchBar';

const SUGGESTIONS = {
  documents: [
    {
      id: 'doc_ct',
      title: 'Code du travail',
      type_code: 'CODE',
      type_name: 'Code',
    },
  ],
  articles: [
    {
      id: 'art_49',
      number: '49',
      document_id: 'doc_ct',
      document_title: 'Code du travail',
      type_code: 'CODE',
    },
  ],
  passages: [
    {
      id: 'art_12',
      number: '12',
      document_id: 'doc_ct',
      document_title: 'Code du travail',
      snippet: 'Le licenciement exige un [[préavis]] dont la durée varie.',
    },
  ],
};

describe('LibrarySearchBar', () => {
  beforeEach(() => {
    server.use(
      http.get('*/api/v1/library/suggest', () =>
        HttpResponse.json({ success: true, data: SUGGESTIONS }),
      ),
    );
  });

  function setup(overrides: Partial<React.ComponentProps<typeof LibrarySearchBar>> = {}) {
    const onSubmit = vi.fn();
    const onOpenSuggestion = vi.fn();
    const onChange = vi.fn();
    renderWithProviders(
      <LibrarySearchBar
        value="préavis"
        onChange={onChange}
        onSubmit={onSubmit}
        onOpenSuggestion={onOpenSuggestion}
        {...overrides}
      />,
    );
    return { onSubmit, onOpenSuggestion, onChange };
  }

  it('propose textes, articles et passages surlignés pendant la saisie', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('combobox'));

    // Les trois groupes apparaissent.
    expect(await screen.findByText('Textes')).toBeInTheDocument();
    expect(screen.getByText('Articles')).toBeInTheDocument();
    expect(screen.getByText('Dans le texte des lois')).toBeInTheDocument();

    expect(screen.getByText('Code du travail')).toBeInTheDocument();
    expect(
      screen.getByText('Article 49 — Code du travail'),
    ).toBeInTheDocument();

    // La correspondance du passage est surlignée via <mark> (pas de HTML brut).
    const mark = screen.getByText('préavis', { selector: 'mark' });
    expect(mark).toBeInTheDocument();
  });

  it("ouvre la suggestion cliquée dans l'espace de lecture", async () => {
    const user = userEvent.setup();
    const { onOpenSuggestion } = setup();

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('Code du travail'));
    expect(onOpenSuggestion).toHaveBeenCalledWith('doc_ct', null);

    await user.click(screen.getByRole('combobox'));
    await user.click(
      await screen.findByText('Article 49 — Code du travail'),
    );
    expect(onOpenSuggestion).toHaveBeenCalledWith('doc_ct', 'art_49');
  });

  it('« Rechercher dans tout le fonds » lance la recherche complète', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();

    await user.click(screen.getByRole('combobox'));
    await user.click(
      await screen.findByText(/dans tout le fonds/),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });
});

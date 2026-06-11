import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import ChatComposer from './ChatComposer';

describe('ChatComposer', () => {
  beforeEach(() => {
    server.use(
      http.get('*/api/v1/assistant/references', () =>
        HttpResponse.json({
          data: [
            {
              id: 'doc_code_travail',
              title: 'Code du travail',
              type_code: 'CODE',
              type_name: 'Code',
            },
          ],
        }),
      ),
    );
  });

  it('ouvre le sélecteur de références en tapant « @ » et épingle un texte', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ChatComposer onSend={() => {}} onStop={() => {}} isStreaming={false} />,
    );

    const textarea = screen.getByPlaceholderText(/Posez une question/);
    await user.type(textarea, '@');

    // Le « @ » déclencheur est retiré du champ et le panneau s'ouvre.
    expect((textarea as HTMLTextAreaElement).value).toBe('');
    expect(
      await screen.findByText('Cibler la recherche sur un texte'),
    ).toBeInTheDocument();

    await user.click(await screen.findByText('Code du travail'));

    // Le texte est épinglé en chip (le panneau se ferme).
    expect(screen.getByText('Recherche ciblée')).toBeInTheDocument();
    expect(screen.getByText('Code du travail')).toBeInTheDocument();
    expect(
      screen.queryByText('Cibler la recherche sur un texte'),
    ).not.toBeInTheDocument();
  });

  it('envoie le message avec le mode et les références épinglées', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ChatComposer onSend={onSend} onStop={() => {}} isStreaming={false} />,
    );

    // Épingler via le bouton « @ ».
    await user.click(screen.getByTitle(/Cibler la recherche/));
    await user.click(await screen.findByText('Code du travail'));

    // Mode analyse approfondie.
    await user.click(screen.getByRole('button', { name: /Analyse/ }));

    const textarea = screen.getByPlaceholderText(/Posez une question/);
    await user.type(textarea, 'Quel est le délai de préavis ?{Enter}');

    expect(onSend).toHaveBeenCalledWith('Quel est le délai de préavis ?', {
      mode: 'analysis',
      references: [
        expect.objectContaining({ id: 'doc_code_travail' }),
      ],
    });

    // Le champ est vidé mais le périmètre épinglé reste actif.
    expect((textarea as HTMLTextAreaElement).value).toBe('');
    expect(screen.getByText('Code du travail')).toBeInTheDocument();
  });
});

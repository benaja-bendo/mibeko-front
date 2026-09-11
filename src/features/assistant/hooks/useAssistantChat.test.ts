import { act, renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { streamChat } from '../api/assistantApi';
import { persistedToChatMessages, useAssistantChat } from './useAssistantChat';

vi.mock('../api/assistantApi', () => ({ streamChat: vi.fn() }));

beforeEach(() => { vi.mocked(streamChat).mockReset(); });

describe('assistant interrupted exchanges', () => {
  it('keeps the error after DONE, even when no text was generated', async () => {
    vi.mocked(streamChat).mockImplementation(async (_, callbacks) => {
      callbacks.onError?.('Service indisponible');
      callbacks.onDone?.();
    });
    const { result } = renderHook(() => useAssistantChat());
    await act(async () => result.current.sendMessage('Ma question'));
    expect(result.current.messages[1]).toMatchObject({ error: true, errorMessage: 'Service indisponible', pending: false });
  });

  it('preserves partial text and its separate error explanation', async () => {
    vi.mocked(streamChat).mockImplementation(async (_, callbacks) => {
      callbacks.onDelta?.('Début de réponse');
      callbacks.onError?.('Connexion interrompue');
      callbacks.onDone?.();
    });
    const { result } = renderHook(() => useAssistantChat());
    await act(async () => result.current.sendMessage('Ma question'));
    expect(result.current.messages[1]).toMatchObject({ content: 'Début de réponse', error: true, errorMessage: 'Connexion interrompue' });
  });

  it('restores failed status from history', () => {
    expect(persistedToChatMessages([{ id: 'failed', role: 'assistant', content: 'Début', meta: { turn_status: 'error', error_message: 'Réessayez' } }])[0])
      .toMatchObject({ error: true, errorMessage: 'Réessayez' });
  });

  it('does not send two requests on a double click', async () => {
    let finish!: () => void;
    vi.mocked(streamChat).mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useAssistantChat());
    let request!: Promise<void>;
    act(() => {
      request = result.current.sendMessage('Ma question');
      void result.current.sendMessage('Ma question');
    });
    expect(streamChat).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); await request; });
  });
});

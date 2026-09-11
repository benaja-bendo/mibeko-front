import { vi, describe, it, expect, beforeEach } from 'vitest';
import { openSsePost } from '@/shared/api/sse';
import { streamChat } from './assistantApi';

vi.mock('@/shared/api/sse', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/api/sse')>(),
  openSsePost: vi.fn(),
}));
beforeEach(() => { vi.mocked(openSsePost).mockReset(); });

describe('assistant stream completion', () => {
  it('does not call success completion after a server error', async () => {
    vi.mocked(openSsePost).mockImplementation(async ({ onFrame }) => {
      onFrame({ event: 'error', data: '{"message":"Indisponible"}' });
      onFrame({ event: 'message', data: '[DONE]' });
    });
    const onError = vi.fn();
    const onDone = vi.fn();
    await streamChat({ message: 'Question' }, { onError, onDone });
    expect(onError).toHaveBeenCalledWith('Indisponible');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('reports a transport EOF without DONE as interrupted', async () => {
    vi.mocked(openSsePost).mockResolvedValue();
    const onError = vi.fn();
    const onDone = vi.fn();
    await streamChat({ message: 'Question' }, { onError, onDone });
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('interrompue'));
    expect(onDone).not.toHaveBeenCalled();
  });

  it('completes a successful stream once', async () => {
    vi.mocked(openSsePost).mockImplementation(async ({ onFrame }) => { onFrame({ event: 'message', data: '[DONE]' }); });
    const onDone = vi.fn();
    await streamChat({ message: 'Question' }, { onDone });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

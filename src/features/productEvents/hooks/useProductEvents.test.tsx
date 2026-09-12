import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { PropsWithChildren } from 'react';
import { server } from '@/test/msw/server';
import { useProductEvents } from './useProductEvents';

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useProductEvents', () => {
  it('envoie le payload exact pour search_useful (fixture store-success.json)', async () => {
    let receivedBody: Record<string, unknown> | null = null;
    server.use(
      http.post('*/api/v1/product-events', async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { success: true, message: 'Événement enregistré.', data: { id: 'evt_1', event_type: 'search_useful', created_at: '2026-01-01T00:00:00+00:00' } },
          { status: 201 },
        );
      }),
    );

    const { result } = renderHook(() => useProductEvents(), { wrapper });
    result.current.recordSearchUseful('art_1');

    await waitFor(() =>
      expect(receivedBody).toMatchObject({ event_type: 'search_useful', surface: 'web', reference_id: 'art_1' }),
    );
    expect(receivedBody).toHaveProperty('client_event_id');
  });

  it("une référence invalide (422) ne casse pas l'appelant (fire-and-forget)", async () => {
    server.use(
      http.post('*/api/v1/product-events', () =>
        HttpResponse.json(
          { message: 'Aucune référence valide.', errors: { reference_id: ['Aucune référence valide.'] } },
          { status: 422 },
        ),
      ),
    );

    const { result } = renderHook(() => useProductEvents(), { wrapper });

    expect(() => result.current.recordSearchUseful('inconnu')).not.toThrow();
  });
});

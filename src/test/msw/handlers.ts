import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/v1/home', () => HttpResponse.json({ status: 'ok' })),
  http.get('/py/api/v1/health', () => HttpResponse.json({ status: 'ok' })),
  http.get('/api/v1/legal-documents', () =>
    HttpResponse.json({
      success: true,
      data: [],
      pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    })
  ),
];

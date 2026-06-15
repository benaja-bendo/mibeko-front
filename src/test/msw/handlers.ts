import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('*/api/v1/home', () => HttpResponse.json({ status: 'ok' })),
  // Autocomplétion de la Bibliothèque : vide par défaut (les tests qui en ont
  // besoin la surchargent avec server.use()).
  http.get('*/api/v1/library/suggest', () =>
    HttpResponse.json({
      success: true,
      data: { documents: [], articles: [], passages: [] },
    })
  ),
  http.get('*/py/api/v1/health', () => HttpResponse.json({ status: 'ok' })),
  http.get('*/api/v1/institutions', () => HttpResponse.json({ data: [] })),
  http.get('*/api/v1/document-types', () => HttpResponse.json({ data: [] })),
  http.get('*/api/v1/legal-documents', () =>
    HttpResponse.json({
      success: true,
      data: [],
      pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    })
  ),
  // Dossiers : liste vide par défaut (la page Bibliothèque et le Dashboard la
  // chargent ; les tests dédiés la surchargent avec server.use()).
  http.get('*/api/v1/dossiers', () =>
    HttpResponse.json({ success: true, data: [] })
  ),
];

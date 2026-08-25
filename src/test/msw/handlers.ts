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
  // Authentification : les écrans d'inscription et de réinitialisation appellent
  // ces routes au montage d'un formulaire soumis. Réponses neutres par défaut,
  // les tests qui vérifient un cas précis les surchargent avec server.use().
  http.post('*/api/v1/register', () =>
    HttpResponse.json({
      success: true,
      data: {
        token: 'jeton-de-test',
        user: { id: 'u1', name: 'Test', email: 'test@exemple.com', roles: ['mobile_user'], permissions: [] },
      },
    })
  ),
  http.post('*/api/v1/forgot-password', () =>
    HttpResponse.json({
      success: true,
      message: 'Si un compte existe pour cette adresse, un code de réinitialisation a été envoyé.',
      data: null,
    })
  ),
  http.post('*/api/v1/reset-password', () =>
    HttpResponse.json({ success: true, message: 'Mot de passe réinitialisé.', data: null })
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

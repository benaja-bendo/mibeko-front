import { defaultRedirectFor } from './redirect';
import type { User, UserRole } from '@/shared/types/auth';

function userWith(...roles: UserRole[]): User {
  return { id: 'u1', name: 'Test', email: 'test@exemple.com', roles, permissions: [] };
}

describe('defaultRedirectFor', () => {
  it("envoie un compte sans abonnement sur son compte, jamais sur l'espace Pro", () => {
    // La régression à empêcher : `/app` et `/app/library` exigent `user_pro`,
    // donc un compte fraîchement créé y était accueilli par « Fonctionnalité
    // réservée aux abonnés Pro ».
    expect(defaultRedirectFor(userWith('mobile_user'))).toBe('/settings/account');
  });

  it('envoie un abonné Pro sur la bibliothèque', () => {
    expect(defaultRedirectFor(userWith('user_pro'))).toBe('/app/library');
  });

  it('envoie un éditeur sur la curation et un administrateur sur l’administration', () => {
    expect(defaultRedirectFor(userWith('editor'))).toBe('/editor');
    expect(defaultRedirectFor(userWith('admin'))).toBe('/admin');
  });

  it('renvoie vers la connexion quand personne n’est authentifié', () => {
    expect(defaultRedirectFor(null)).toBe('/auth/login');
  });
});

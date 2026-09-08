import { defaultRedirectFor, redirectAfterRegistration } from './redirect';
import type { User, UserRole } from '@/shared/types/auth';

function userWith(...roles: UserRole[]): User {
  return { id: 'u1', name: 'Test', email: 'test@exemple.com', roles, permissions: [] };
}

describe('defaultRedirectFor', () => {
  it('envoie un compte sans abonnement sur la bibliothèque, comme tout le monde', () => {
    // mibeko-front#24 : la destination ne dépend plus du plan. `mobile_user`
    // est le rôle de toute auto-inscription — web comprise —, pas un palier :
    // l'envoyer ailleurs que le fonds revenait à traiter un nouveau venu en
    // visiteur de seconde classe.
    expect(defaultRedirectFor(userWith('mobile_user'))).toBe('/app/library');
  });

  it('envoie un abonné Pro sur la bibliothèque', () => {
    expect(defaultRedirectFor(userWith('user_pro'))).toBe('/app/library');
  });

  it('envoie un compte sans aucun rôle sur la bibliothèque', () => {
    // Le cas ne devrait pas exister (l'inscription attribue toujours un rôle),
    // mais la règle ne doit pas retomber sur la page de connexion pour autant.
    expect(defaultRedirectFor(userWith())).toBe('/app/library');
  });

  it('envoie un éditeur sur la curation et un administrateur sur l’administration', () => {
    expect(defaultRedirectFor(userWith('editor'))).toBe('/editor');
    expect(defaultRedirectFor(userWith('admin'))).toBe('/admin');
  });

  it('renvoie vers la connexion quand personne n’est authentifié', () => {
    expect(defaultRedirectFor(null)).toBe('/auth/login');
  });
});

describe('redirectAfterRegistration', () => {
  it("conserve l'intention de poser une question après l'inscription", () => {
    expect(redirectAfterRegistration(userWith('mobile_user'), 'assistant')).toBe(
      '/app/assistant',
    );
  });

  it('ignore une destination inconnue et conserve la règle par défaut', () => {
    expect(redirectAfterRegistration(userWith('mobile_user'), 'https://example.com')).toBe(
      '/app/library',
    );
  });
});

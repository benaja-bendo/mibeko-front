import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import type { User } from '@/shared/types/auth';

const TOKEN_KEY = 'mibeko_token';

const admin: User = {
  id: 'admin-1',
  name: 'Alice Admin',
  email: 'admin@mibeko.fr',
  roles: ['admin'],
  permissions: [],
};

const cible: User = {
  id: 'user-1',
  name: 'Paul Pro',
  email: 'pro@mibeko.fr',
  roles: ['user_pro'],
  permissions: [],
};

/** État sérialisé par le middleware persist (tel qu'écrit dans localStorage). */
function persisted(): { raw: string; state: Record<string, unknown> } {
  const raw = localStorage.getItem(TOKEN_KEY) ?? '';
  return { raw, state: raw ? JSON.parse(raw).state : {} };
}

describe('authStore — persistance (partialize)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      impersonator: null,
    });
  });

  it('persiste la session normale (token + user)', () => {
    useAuthStore.getState().setAuth(admin, 'admin-token');
    const { state } = persisted();
    expect(state.token).toBe('admin-token');
    expect((state.user as User).id).toBe(admin.id);
  });

  it("n'écrit JAMAIS le jeton admin dans localStorage pendant une impersonation", () => {
    useAuthStore.getState().setAuth(admin, 'admin-token');
    useAuthStore.getState().startImpersonation(cible, 'impersonation-token');

    const { raw, state } = persisted();
    // Le storage ne contient que la session incarnée, jamais l'admin d'origine.
    expect(state.impersonator).toBeUndefined();
    expect(raw).not.toContain('admin-token');
    expect(state.token).toBe('impersonation-token');

    // L'impersonation reste pleinement fonctionnelle en mémoire.
    const mem = useAuthStore.getState();
    expect(mem.impersonator?.token).toBe('admin-token');
    expect(mem.user?.id).toBe(cible.id);
  });

  it("stopImpersonation rétablit la session admin (et la re-persiste)", () => {
    useAuthStore.getState().setAuth(admin, 'admin-token');
    useAuthStore.getState().startImpersonation(cible, 'impersonation-token');
    useAuthStore.getState().stopImpersonation();

    const mem = useAuthStore.getState();
    expect(mem.impersonator).toBeNull();
    expect(mem.token).toBe('admin-token');

    const { state } = persisted();
    expect(state.token).toBe('admin-token');
    expect(state.impersonator).toBeUndefined();
  });

  it('réhydratation : nettoie une impersonation sans jeton d’origine sans casser la session', async () => {
    // État hérité/forgé : une impersonation persistée sans jeton d'origine.
    localStorage.setItem(
      TOKEN_KEY,
      JSON.stringify({
        state: {
          token: 'session-token',
          user: cible,
          impersonator: { user: admin },
        },
        version: 0,
      }),
    );

    await useAuthStore.persist.rehydrate();

    const mem = useAuthStore.getState();
    expect(mem.impersonator).toBeNull();
    expect(mem.token).toBe('session-token');
    expect(mem.isAuthenticated).toBe(true);
    expect(mem.isInitialized).toBe(true);

    // La réécriture post-réhydratation purge l'entrée du storage.
    const { state } = persisted();
    expect(state.impersonator).toBeUndefined();
  });
});

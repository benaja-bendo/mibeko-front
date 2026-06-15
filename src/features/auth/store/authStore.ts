import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/shared/types/auth';

const TOKEN_KEY = 'mibeko_token';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  /**
   * Sauvegarde de l'identité admin pendant une session d'impersonation
   * (« mode support »). Quand elle est non nulle, `user`/`token` correspondent
   * à l'utilisateur incarné ; on rétablit l'admin via `stopImpersonation`.
   */
  impersonator: { user: User; token: string } | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
  markInitialized: () => void;
  startImpersonation: (user: User, token: string) => void;
  stopImpersonation: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: false,
      impersonator: null,

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, token: null, isAuthenticated: false, impersonator: null }),

      setUser: (user) =>
        set({ user }),

      markInitialized: () =>
        set({ isInitialized: true }),

      // Bascule l'identité active vers l'utilisateur incarné, en gardant
      // l'admin en réserve. Tout le reste (axios, sidebar, garde de routes)
      // agit alors naturellement comme l'utilisateur incarné.
      startImpersonation: (user, token) => {
        const { user: adminUser, token: adminToken, impersonator } = get();
        if (!adminUser || !adminToken || impersonator) return;
        set({
          impersonator: { user: adminUser, token: adminToken },
          user,
          token,
          isAuthenticated: true,
        });
      },

      stopImpersonation: () => {
        const { impersonator } = get();
        if (!impersonator) return;
        set({
          user: impersonator.user,
          token: impersonator.token,
          isAuthenticated: true,
          impersonator: null,
        });
      },
    }),
    {
      name: TOKEN_KEY,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        impersonator: state.impersonator,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.token;
          state.markInitialized();
        }
      },
    },
  ),
);

// Token accessor used by axios interceptors (outside React).
// Pendant une impersonation, `token` est déjà celui de l'utilisateur incarné.
export const getStoredToken = (): string | null =>
  useAuthStore.getState().token;

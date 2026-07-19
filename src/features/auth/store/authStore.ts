import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/shared/types/auth';
import { configureTokenAccess } from '@/shared/auth/tokenAccess';

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
      // Sécurité : le jeton de l'admin d'origine (`impersonator.token`) ne doit
      // JAMAIS être écrit dans localStorage — une XSS exfiltrerait sinon une
      // session admin en plus de la session incarnée. L'impersonation ne vit
      // donc qu'en mémoire : après un rechargement de page, l'admin devra la
      // relancer depuis /admin/utilisateurs.
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // État hérité d'une ancienne version (ou entrée forgée) : une
          // impersonation réhydratée sans jeton d'origine est inutilisable,
          // on la nettoie sans toucher à la session courante. Le premier
          // `set` (markInitialized) réécrit ensuite le storage sans elle.
          if (state.impersonator && !state.impersonator.token) {
            state.impersonator = null;
          }
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

// Alimente l'abstraction `shared/auth/tokenAccess` : ainsi les couches basses
// (clients axios, flux SSE) accèdent au jeton et réagissent aux 401 sans jamais
// importer `features/auth` (respect de la règle FSD `shared ↛ features`).
configureTokenAccess({
  getToken: getStoredToken,
  onUnauthorized: () => useAuthStore.getState().clearAuth(),
});

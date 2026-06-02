import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/shared/types/auth';

const TOKEN_KEY = 'mibeko_token';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
  markInitialized: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: false,

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, token: null, isAuthenticated: false }),

      setUser: (user) =>
        set({ user }),

      markInitialized: () =>
        set({ isInitialized: true }),
    }),
    {
      name: TOKEN_KEY,
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.token;
          state.markInitialized();
        }
      },
    },
  ),
);

// Token accessor used by axios interceptors (outside React)
export const getStoredToken = (): string | null =>
  useAuthStore.getState().token;

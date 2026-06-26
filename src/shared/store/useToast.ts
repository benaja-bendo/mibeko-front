import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: ToastItem[];
  /** Affiche un toast (auto-fermeture après `duration` ms, 0 = persistant). */
  show: (message: string, type?: ToastType, duration?: number) => number;
  dismiss: (id: number) => void;
}

let nextId = 0;

/**
 * Store de notifications transitoires (toasts), partagé par toute l'application.
 * Monté une seule fois via `<Toaster />` dans le layout. Remplace les toasts
 * locaux par page et les `console.info` muets : tout retour utilisateur passe ici.
 */
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, type = 'info', duration = 5000) => {
    const id = ++nextId;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration);
    }
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Helper ergonomique : `toast.success('…')`, `toast.error(e)`, `toast.info('…')`.
 * Utilisable hors composant (callbacks de mutations, etc.).
 */
export const toast = {
  success: (message: string, duration?: number) => useToastStore.getState().show(message, 'success', duration),
  error: (message: string, duration?: number) => useToastStore.getState().show(message, 'error', duration),
  info: (message: string, duration?: number) => useToastStore.getState().show(message, 'info', duration),
  /** Extrait un message lisible d'une erreur inconnue puis l'affiche. */
  fromError: (err: unknown, fallback = 'Une erreur est survenue') =>
    useToastStore.getState().show(err instanceof Error ? err.message : fallback, 'error'),
};

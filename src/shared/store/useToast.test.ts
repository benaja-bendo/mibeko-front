import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToastStore, toast } from './useToast';

describe('useToast store', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useRealTimers();
  });

  it('ajoute un toast et renvoie son id', () => {
    const id = toast.success('Publié');
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ id, message: 'Publié', type: 'success' });
  });

  it('ferme un toast via dismiss', () => {
    const id = toast.info('Coucou');
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('extrait le message d’une Error via fromError', () => {
    toast.fromError(new Error('Boom'));
    expect(useToastStore.getState().toasts[0]).toMatchObject({ message: 'Boom', type: 'error' });
  });

  it('utilise le fallback quand l’erreur est inconnue', () => {
    toast.fromError('pas une erreur', 'Échec générique');
    expect(useToastStore.getState().toasts[0].message).toBe('Échec générique');
  });

  it('auto-ferme après la durée', () => {
    vi.useFakeTimers();
    toast.success('Temporaire', 1000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('ne ferme jamais quand la durée est 0', () => {
    vi.useFakeTimers();
    toast.error('Persistant', 0);
    vi.advanceTimersByTime(100000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });
});

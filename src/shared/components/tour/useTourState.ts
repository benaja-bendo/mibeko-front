/**
 * useTourState.ts — État d'ouverture d'une visite guidée (GuidedTour).
 *
 * Auto-démarre à la première visite de la page (persistance localStorage),
 * et expose `start` pour relancer la visite manuellement.
 */

import { useCallback, useEffect, useState } from 'react';

const tourSeenKey = (tourId: string) => `mibeko_tour_${tourId}_seen`;

/** Une visite a-t-elle déjà été vue (et donc à ne pas relancer) ? */
export function isTourSeen(tourId: string): boolean {
  try {
    return localStorage.getItem(tourSeenKey(tourId)) === '1';
  } catch {
    return true;
  }
}

/** Marque une visite comme vue (appelé à la fermeture/fin). */
export function markTourSeen(tourId: string): void {
  try {
    localStorage.setItem(tourSeenKey(tourId), '1');
  } catch {
    /* stockage indisponible — la visite se redéclenchera */
  }
}

/**
 * État d'ouverture d'une visite : auto-démarre à la première visite (après
 * `autoStartDelay` ms pour laisser l'interface se peindre), persiste la
 * fermeture, et expose `start` pour relancer manuellement.
 */
export function useTourState(tourId: string, autoStartDelay = 800) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isTourSeen(tourId)) return;
    const t = setTimeout(() => setOpen(true), autoStartDelay);
    return () => clearTimeout(t);
  }, [tourId, autoStartDelay]);

  const close = useCallback(() => {
    markTourSeen(tourId);
    setOpen(false);
  }, [tourId]);

  const start = useCallback(() => setOpen(true), []);

  return { open, start, close };
}

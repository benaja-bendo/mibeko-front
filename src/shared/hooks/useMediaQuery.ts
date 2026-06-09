/**
 * useMediaQuery.ts — Hook réactif sur une media query CSS.
 *
 * Permet d'adapter le comportement (et pas seulement le style) selon la taille
 * d'écran — ex. afficher la lecture dans un panneau inline (desktop) ou dans un
 * Sheet plein écran (mobile).
 */

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Raccourci : vrai à partir du breakpoint Tailwind `lg` (1024px). */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

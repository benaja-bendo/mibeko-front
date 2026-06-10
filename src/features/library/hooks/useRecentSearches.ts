/**
 * useRecentSearches.ts — Historique local des recherches de la Bibliothèque.
 *
 * Persisté en localStorage (pas de backend : l'historique est personnel et
 * local au navigateur, comme les Dossiers). Dédoublonné, le plus récent en
 * premier, plafonné à MAX_RECENT entrées.
 */

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'mibeko_library_recent_searches';
const MAX_RECENT = 6;

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((q) => typeof q === 'string') : [];
  } catch {
    return [];
  }
}

function write(items: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* stockage indisponible — l'historique restera en mémoire */
  }
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(read);

  const addRecentSearch = useCallback((query: string) => {
    const q = query.trim();
    if (q.length < 2) return;
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((p) => p.toLowerCase() !== q.toLowerCase())].slice(
        0,
        MAX_RECENT,
      );
      write(next);
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    write([]);
  }, []);

  return { recentSearches, addRecentSearch, clearRecentSearches };
}

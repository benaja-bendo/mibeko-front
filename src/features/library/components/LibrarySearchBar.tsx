/**
 * LibrarySearchBar.tsx — Barre de recherche sémantique de la Bibliothèque.
 *
 * Saisie en langage naturel ("quels sont mes droits au préavis ?") ou par
 * référence ("article 45 code du travail"). Raccourci "/" pour focaliser.
 */

import { useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';

interface LibrarySearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
}

export default function LibrarySearchBar({
  value,
  onChange,
  onSubmit,
  isLoading,
}: LibrarySearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Raccourci clavier "/" pour focaliser la recherche (hors champ de saisie).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-t3" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
        placeholder="Rechercher une notion, un article, une question juridique…"
        className="h-11 w-full rounded-xl border border-b1 bg-s1 pl-11 pr-24 text-sm text-t1 placeholder:text-t3 transition-colors focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
      />

      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {isLoading ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin text-gold" />
        ) : value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-t3 hover:bg-s2 hover:text-t1"
            title="Effacer"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="mr-1 hidden rounded border border-b1 bg-s2 px-1.5 py-0.5 font-mono text-[10px] text-t3 sm:inline">
            /
          </kbd>
        )}
        <button
          type="button"
          onClick={onSubmit}
          className="flex h-7 items-center rounded-lg bg-gold px-3 text-xs font-semibold text-[#120e00] transition-opacity hover:opacity-90"
        >
          Rechercher
        </button>
      </div>
    </div>
  );
}

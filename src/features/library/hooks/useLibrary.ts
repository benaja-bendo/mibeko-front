/**
 * useLibrary.ts — Hooks TanStack Query pour la Bibliothèque Juridique.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getDocumentTypes,
  getInstitutions,
  getLibraryHome,
  getLibrarySuggestions,
  searchLibrary,
  streamLibraryExplain,
  streamLibrarySynthesis,
  type SearchParams,
} from '@/features/library/api/libraryApi';
import type {
  LibraryAiRequest,
  SearchResultItem,
} from '@/features/library/types';

export const libraryKeys = {
  all: ['library'] as const,
  home: () => [...libraryKeys.all, 'home'] as const,
  search: (params: SearchParams) => [...libraryKeys.all, 'search', params] as const,
  suggest: (q: string) => [...libraryKeys.all, 'suggest', q] as const,
  types: () => [...libraryKeys.all, 'document-types'] as const,
  institutions: () => [...libraryKeys.all, 'institutions'] as const,
};

/** Accueil de la Bibliothèque (textes fondamentaux, récents, stats). */
export function useLibraryHome() {
  return useQuery({
    queryKey: libraryKeys.home(),
    queryFn: getLibraryHome,
    staleTime: 10 * 60_000,
  });
}

/**
 * Recherche juridique. Désactivée tant que la requête fait moins de 2 caractères.
 * Conserve les résultats précédents pendant le rechargement (pas de clignotement).
 */
export function useLibrarySearch(params: SearchParams) {
  const enabled = params.q.trim().length >= 2;
  return useQuery({
    queryKey: libraryKeys.search(params),
    queryFn: () => searchLibrary(params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/**
 * Autocomplétion temps réel de la barre de recherche.
 *
 * Le debounce (250 ms) est intégré : passer la frappe brute suffit. Les
 * suggestions précédentes restent affichées pendant le rechargement pour
 * éviter tout clignotement du panneau.
 */
export function useLibrarySuggestions(q: string) {
  const trimmed = q.trim();
  const [debouncedQ, setDebouncedQ] = useState(trimmed);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(trimmed), 250);
    return () => window.clearTimeout(timer);
  }, [trimmed]);

  return useQuery({
    queryKey: libraryKeys.suggest(debouncedQ),
    queryFn: () => getLibrarySuggestions(debouncedQ),
    enabled: debouncedQ.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/** Types de documents pour les filtres (mis en cache longuement). */
export function useDocumentTypes() {
  return useQuery({
    queryKey: libraryKeys.types(),
    queryFn: getDocumentTypes,
    staleTime: 10 * 60_000,
  });
}

/** Institutions émettrices pour les filtres (mis en cache longuement). */
export function useInstitutions() {
  return useQuery({
    queryKey: libraryKeys.institutions(),
    queryFn: getInstitutions,
    staleTime: 10 * 60_000,
  });
}

/** État du flux IA affiché dans le panneau droit. */
export interface LibraryAiState {
  /** Requête en cours (null = panneau IA fermé). */
  request: LibraryAiRequest | null;
  status: string | null;
  sources: SearchResultItem[];
  /** Texte accumulé au fil du streaming. */
  text: string;
  isStreaming: boolean;
  error: string | null;
}

const EMPTY_AI: LibraryAiState = {
  request: null,
  status: null,
  sources: [],
  text: '',
  isStreaming: false,
  error: null,
};

/**
 * Pilote la couche IA « à la demande » de la Bibliothèque (explication d'un
 * article ou synthèse d'une recherche), consommée en streaming SSE.
 *
 * Une seule requête à la fois : démarrer en annule une précédente. `close`
 * coupe le flux et réinitialise l'état (le panneau se ferme).
 */
export function useLibraryAi() {
  const [state, setState] = useState<LibraryAiState>(EMPTY_AI);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback((request: LibraryAiRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      request,
      status: null,
      sources: [],
      text: '',
      isStreaming: true,
      error: null,
    });

    const callbacks = {
      onStatus: (message: string) =>
        setState((s) => ({ ...s, status: message })),
      onSources: (sources: SearchResultItem[]) =>
        setState((s) => ({ ...s, sources })),
      onDelta: (delta: string) =>
        setState((s) => ({ ...s, text: s.text + delta })),
      onError: (error: string) =>
        setState((s) => ({ ...s, error, isStreaming: false, status: null })),
      onDone: () =>
        setState((s) => ({ ...s, isStreaming: false, status: null })),
    };

    const run =
      request.kind === 'explain'
        ? streamLibraryExplain(
            { articleId: request.articleId, signal: controller.signal },
            callbacks,
          )
        : streamLibrarySynthesis(
            { q: request.q, filters: request.filters, signal: controller.signal },
            callbacks,
          );

    run.catch((e: unknown) => {
      // Annulation volontaire (changement de requête / fermeture) : on ignore.
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setState((s) => ({
        ...s,
        error: e instanceof Error ? e.message : 'Erreur inconnue',
        isStreaming: false,
        status: null,
      }));
    });
  }, []);

  const close = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(EMPTY_AI);
  }, []);

  return { ...state, start, close, active: state.request !== null };
}

/**
 * useWatches.ts — Hooks TanStack Query de la feature Watches
 * (mibeko-dashboard#125).
 *
 * État serveur uniquement (convention du repo, cf. `useDossierAnnexes`) :
 * la liste des abonnements vit dans React Query, avec mise à jour optimiste
 * du cache pour que le bouton « Suivre » bascule instantanément.
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createWatch, deleteWatch, listWatches } from '@/features/watches/api/watchesApi';
import type {
  WatchableType,
  WatchedDocument,
  WatchedTheme,
  WatchSubscription,
} from '@/features/watches/types';

export const watchKeys = {
  all: ['watches'] as const,
  list: () => [...watchKeys.all, 'list'] as const,
};

/** Liste complète des abonnements de l'utilisateur courant. */
export function useWatches() {
  return useQuery({
    queryKey: watchKeys.list(),
    queryFn: listWatches,
    staleTime: 30_000,
  });
}

/** Abonnement existant pour une cible donnée, dérivé de la liste (pas de requête dédiée). */
function useWatchFor(
  watchableType: WatchableType,
  watchableId: string | null | undefined,
): WatchSubscription | null {
  const { data } = useWatches();
  return useMemo(() => {
    if (!watchableId) return null;
    return (
      data?.find((w) => w.watchableType === watchableType && w.watchableId === watchableId) ?? null
    );
  }, [data, watchableType, watchableId]);
}

/**
 * Mutation générique suivre/ne plus suivre, avec patch optimiste du cache
 * liste — même patron que `useDossierAnnexes` pour les annexes de dossier.
 */
function useToggleWatch() {
  const qc = useQueryClient();
  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: watchKeys.list() }),
    [qc],
  );

  const followMut = useMutation({
    mutationFn: ({
      watchableType,
      watchableId,
    }: {
      watchableType: WatchableType;
      watchableId: string;
    }) => createWatch(watchableType, watchableId),
    onSettled: invalidate,
  });

  const unfollowMut = useMutation({
    mutationFn: (id: string) => deleteWatch(id),
    onSettled: invalidate,
  });

  const toggle = useCallback(
    (
      watchableType: WatchableType,
      watchableId: string,
      current: WatchSubscription | null,
      optimisticWatchable: WatchedDocument | WatchedTheme,
    ) => {
      if (current) {
        qc.setQueryData<WatchSubscription[]>(watchKeys.list(), (prev) =>
          prev?.filter((w) => w.id !== current.id),
        );
        unfollowMut.mutate(current.id);
        return;
      }

      qc.setQueryData<WatchSubscription[]>(watchKeys.list(), (prev) => [
        ...(prev ?? []),
        {
          // Id provisoire : écrasé par la réponse serveur à l'`invalidate`
          // (`onSettled`). Le rendu ne s'appuie jamais sur cet id avant
          // réconciliation — seule sa présence dans la liste compte.
          id: `optimistic-${watchableType}-${watchableId}`,
          watchableType,
          watchableId,
          watchable: optimisticWatchable,
          createdAt: new Date().toISOString(),
        },
      ]);
      followMut.mutate({ watchableType, watchableId });
    },
    [qc, followMut, unfollowMut],
  );

  return { toggle, isPending: followMut.isPending || unfollowMut.isPending };
}

export interface WatchToggle {
  isWatching: boolean;
  isPending: boolean;
  toggle: () => void;
}

/** Bouton « Suivre ce texte » — prêt à brancher sur un texte affiché. */
export function useWatchDocument(document: WatchedDocument | null): WatchToggle {
  const current = useWatchFor('document', document?.id);
  const { toggle, isPending } = useToggleWatch();

  return {
    isWatching: current !== null,
    isPending,
    toggle: () => {
      if (!document) return;
      toggle('document', document.id, current, document);
    },
  };
}

/** Bouton « Suivre ce thème » — prêt à brancher sur un thème affiché. */
export function useWatchTheme(theme: WatchedTheme | null): WatchToggle {
  const current = useWatchFor('theme', theme?.id);
  const { toggle, isPending } = useToggleWatch();

  return {
    isWatching: current !== null,
    isPending,
    toggle: () => {
      if (!theme) return;
      toggle('theme', theme.id, current, theme);
    },
  };
}

/** Retire un abonnement depuis la page de gestion (pas de mise à jour optimiste utile ici). */
export function useRemoveWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWatch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: watchKeys.list() }),
  });
}

/**
 * useConversations.ts — Hooks TanStack Query pour l'historique des conversations.
 *
 * Sépare l'état serveur (liste, détail) de l'état UI du chat (cf. useAssistantChat).
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  type ListConversationsParams,
} from '@/features/assistant/api/assistantApi';

export const assistantKeys = {
  all: ['assistant'] as const,
  list: (params: ListConversationsParams) =>
    [...assistantKeys.all, 'conversations', params] as const,
  detail: (id: string) => [...assistantKeys.all, 'conversation', id] as const,
};

/**
 * Fraîcheur du détail d'une conversation : rouvrir une conversation consultée
 * à l'instant ne refait pas d'appel réseau. Jamais durablement périmé car le
 * détail est invalidé explicitement après chaque échange (cf. Assistant.tsx).
 */
const CONVERSATION_STALE_TIME = 30_000;

/** Liste paginée des conversations, filtrable par titre. */
export function useConversations(params: ListConversationsParams = {}) {
  return useQuery({
    queryKey: assistantKeys.list(params),
    queryFn: () => listConversations(params),
    staleTime: 30_000,
  });
}

/** Détail d'une conversation (messages + citations). Désactivé si aucun id. */
export function useConversation(id: string | null) {
  return useQuery({
    queryKey: assistantKeys.detail(id ?? ''),
    queryFn: () => getConversation(id as string),
    enabled: !!id,
    staleTime: CONVERSATION_STALE_TIME,
  });
}

/**
 * Préchargement du détail d'une conversation (au survol d'un item de
 * l'historique) : à l'ouverture effective, les messages sont déjà en cache et
 * l'affichage est instantané.
 */
export function usePrefetchConversation() {
  const qc = useQueryClient();

  return useCallback(
    (id: string) => {
      void qc.prefetchQuery({
        queryKey: assistantKeys.detail(id),
        queryFn: () => getConversation(id),
        staleTime: CONVERSATION_STALE_TIME,
      });
    },
    [qc],
  );
}

/** Renommage d'une conversation avec invalidation de la liste. */
export function useRenameConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      renameConversation(id, title),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...assistantKeys.all, 'conversations'] }),
  });
}

/** Suppression d'une conversation avec invalidation de la liste. */
export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...assistantKeys.all, 'conversations'] }),
  });
}

/**
 * useConversations.ts — Hooks TanStack Query pour l'historique des conversations.
 *
 * Sépare l'état serveur (liste, détail) de l'état UI du chat (cf. useAssistantChat).
 */

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
  });
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

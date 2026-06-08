/**
 * useAssistantChat.ts — Machine à états du fil de discussion avec Mibeko IA.
 *
 * Gère le cycle de vie d'un échange :
 *   1. ajout du message utilisateur ;
 *   2. création d'un message assistant "en attente" ;
 *   3. application incrémentale des fragments SSE (effet machine à écrire) ;
 *   4. rattachement des citations puis finalisation.
 *
 * L'état serveur (historique) reste géré par TanStack Query (useConversations) ;
 * ce hook ne porte que l'état UI volatile de la conversation active.
 */

import { useCallback, useRef, useState } from 'react';
import { streamChat } from '@/features/assistant/api/assistantApi';
import type {
  AssistantSource,
  ChatMessage,
  PersistedMessage,
} from '@/features/assistant/types';

/** Génère un identifiant local de message (fallback si crypto indisponible). */
function localId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

interface UseAssistantChatOptions {
  /** Appelé quand une nouvelle conversation est créée côté serveur. */
  onConversationCreated?: (id: string) => void;
}

export function useAssistantChat(options: UseAssistantChatOptions = {}) {
  const { onConversationCreated } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Référence vers le message assistant en cours de rédaction.
  const activeAssistantIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /** Met à jour un message existant par fusion partielle. */
  const patchMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  }, []);

  /** Charge une conversation persistée dans le fil (depuis l'historique). */
  const loadMessages = useCallback(
    (id: string, persisted: PersistedMessage[]) => {
      setConversationId(id);
      setStatus(null);
      setMessages(
        persisted.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.meta?.sources ?? undefined,
          createdAt: m.created_at,
        })),
      );
    },
    [],
  );

  /** Démarre une nouvelle conversation vierge. */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setStatus(null);
    setIsStreaming(false);
    activeAssistantIdRef.current = null;
  }, []);

  /** Interrompt la génération en cours. */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setStatus(null);
    const activeId = activeAssistantIdRef.current;
    if (activeId) {
      patchMessage(activeId, { pending: false });
    }
  }, [patchMessage]);

  /** Envoie un message et consomme la réponse en streaming. */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMessage: ChatMessage = {
        id: localId(),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      const assistantId = localId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        pending: true,
      };
      activeAssistantIdRef.current = assistantId;

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      setStatus(null);

      const controller = new AbortController();
      abortRef.current = controller;

      let sources: AssistantSource[] | undefined;
      let buffer = '';

      try {
        await streamChat(
          { message: trimmed, conversationId, signal: controller.signal },
          {
            onConversationId: (id) => {
              if (!conversationId) {
                setConversationId(id);
                onConversationCreated?.(id);
              }
            },
            onStatus: (msg) => setStatus(msg),
            onSources: (s) => {
              sources = s;
              patchMessage(assistantId, { sources: s });
            },
            onDelta: (delta) => {
              buffer += delta;
              setStatus(null);
              patchMessage(assistantId, { content: buffer });
            },
            onError: (msg) => {
              patchMessage(assistantId, {
                content: buffer || msg,
                error: true,
                pending: false,
              });
            },
            onDone: () => {
              patchMessage(assistantId, {
                content: buffer,
                sources,
                pending: false,
              });
            },
          },
        );
      } catch (err) {
        // Annulation volontaire (Stop) : on ne montre pas d'erreur.
        if (controller.signal.aborted) {
          patchMessage(assistantId, { content: buffer, pending: false });
        } else {
          const message =
            err instanceof Error ? err.message : 'Échec de la génération.';
          patchMessage(assistantId, {
            content: buffer || `⚠️ ${message}`,
            error: true,
            pending: false,
          });
        }
      } finally {
        setIsStreaming(false);
        setStatus(null);
        activeAssistantIdRef.current = null;
        abortRef.current = null;
      }
    },
    [conversationId, isStreaming, onConversationCreated, patchMessage],
  );

  return {
    messages,
    conversationId,
    isStreaming,
    status,
    sendMessage,
    stop,
    reset,
    loadMessages,
  };
}

/**
 * useAssistantChat.ts — Machine à états du fil de discussion avec Mibeko IA.
 *
 * Gère le cycle de vie d'un échange :
 *   1. ajout du message utilisateur ;
 *   2. création d'un message assistant "en attente" ;
 *   3. application incrémentale des fragments SSE (effet machine à écrire) ;
 *   4. rattachement des citations puis finalisation.
 *
 * Ce hook ne porte QUE la conversation « vivante » (celle où l'on écrit).
 * Une conversation d'historique est affichée directement depuis le cache
 * TanStack Query par la page — sans copie dans cet état — et n'est adoptée
 * ici (via `seedMessages`) qu'au moment où l'utilisateur y envoie un message.
 * Une seule source de vérité par conversation : aucune course possible entre
 * un refetch d'historique et un échange en cours.
 */

import { useCallback, useRef, useState } from 'react';
import { streamChat } from '@/features/assistant/api/assistantApi';
import type {
  AssistantSource,
  ChatMessage,
  PersistedMessage,
  SendMessageOptions,
} from '@/features/assistant/types';

/** Génère un identifiant local de message (fallback si crypto indisponible). */
function localId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** Convertit les messages persistés côté Laravel en messages affichables. */
export function persistedToChatMessages(
  persisted: PersistedMessage[],
): ChatMessage[] {
  return persisted.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    sources: m.meta?.sources ?? undefined,
    references: m.meta?.references ?? undefined,
    mode: m.meta?.mode ?? undefined,
    createdAt: m.created_at,
  }));
}

interface UseAssistantChatOptions {
  /** Appelé quand une nouvelle conversation est créée côté serveur. */
  onConversationCreated?: (id: string) => void;
  /**
   * Appelé à la fin de chaque échange (succès, erreur ou interruption) avec
   * l'identifiant de la conversation : permet d'invalider l'historique
   * (ordre/titres) et le détail en cache, désormais périmés.
   */
  onExchangeFinished?: (conversationId: string | null) => void;
}

export function useAssistantChat(options: UseAssistantChatOptions = {}) {
  const { onConversationCreated, onExchangeFinished } = options;

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
    async (text: string, options: SendMessageOptions = {}) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const { mode, references } = options;

      // Conversation cible explicite : écrire depuis une conversation
      // d'historique l'« adopte » (le fil repart de ses messages persistés).
      const targetConversationId =
        options.conversationId !== undefined
          ? options.conversationId
          : conversationId;
      const seedMessages =
        targetConversationId !== conversationId
          ? (options.seedMessages ?? [])
          : null;

      if (targetConversationId !== conversationId) {
        setConversationId(targetConversationId);
      }

      const userMessage: ChatMessage = {
        id: localId(),
        role: 'user',
        content: trimmed,
        mode: mode && mode !== 'concise' ? mode : undefined,
        references:
          references && references.length > 0 ? references : undefined,
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

      setMessages((prev) => [
        ...(seedMessages ?? prev),
        userMessage,
        assistantMessage,
      ]);
      setIsStreaming(true);
      setStatus(null);

      const controller = new AbortController();
      abortRef.current = controller;

      let sources: AssistantSource[] | undefined;
      let buffer = '';
      // Suit l'id réel de l'échange (créé en cours de route pour une nouvelle
      // conversation) afin de le transmettre à onExchangeFinished.
      let exchangeConversationId = targetConversationId;

      try {
        await streamChat(
          {
            message: trimmed,
            conversationId: targetConversationId,
            mode,
            references,
            signal: controller.signal,
          },
          {
            onConversationId: (id) => {
              exchangeConversationId = id;
              if (!targetConversationId) {
                setConversationId(id);
                onConversationCreated?.(id);
              }
            },
            onStatus: (msg) => setStatus(msg),
            onSources: (batch) => {
              // L'IA peut chercher plusieurs fois : on cumule les lots dans
              // l'ordre, sans toucher aux positions — l'index 1-based doit
              // rester aligné avec les marqueurs [n] (déduplication backend).
              const merged = [...(sources ?? []), ...batch];
              sources = merged;
              patchMessage(assistantId, { sources: merged });
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
        onExchangeFinished?.(exchangeConversationId);
      }
    },
    [
      conversationId,
      isStreaming,
      onConversationCreated,
      onExchangeFinished,
      patchMessage,
    ],
  );

  return {
    messages,
    conversationId,
    isStreaming,
    status,
    sendMessage,
    stop,
    reset,
  };
}

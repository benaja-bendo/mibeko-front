/**
 * assistantApi.ts — Client typé de l'Assistant IA (backend Laravel).
 *
 * L'IA (agent RAG `MibekoIA`) est exposée par Laravel :
 *  - CRUD des conversations  → JSON classique (via `laravelClient`/`apiFetch`) ;
 *  - chat en streaming        → SSE (`fetch` + `ReadableStream`, car `EventSource`
 *    ne sait pas émettre de requête POST avec un corps).
 */

import { laravelClient, laravelBaseUrl } from '@/shared/api';
import { getStoredToken } from '@/features/auth/store/authStore';
import type {
  AssistantMode,
  AssistantReference,
  ConversationDetail,
  ConversationSummary,
  FeedbackRating,
  Paginated,
  StreamCallbacks,
} from '@/features/assistant/types';

// ---------------------------------------------------------------------------
// Conversations — CRUD (JSON)
// ---------------------------------------------------------------------------

export interface ListConversationsParams {
  /** Recherche par titre (filtre Laravel `filter.title`). */
  title?: string;
  /** Filtre par date (YYYY-MM-DD). */
  date?: string;
  page?: number;
}

/** Liste paginée des conversations de l'utilisateur courant. */
export async function listConversations(
  params: ListConversationsParams = {},
): Promise<Paginated<ConversationSummary>> {
  const res = await laravelClient.get<Paginated<ConversationSummary>>(
    'assistant/conversations',
    {
      params: {
        'filter.title': params.title || undefined,
        'filter.date': params.date || undefined,
        page: params.page || undefined,
      },
    },
  );
  return res.data;
}

/** Détail d'une conversation, messages inclus (avec citations dans `meta.sources`). */
export async function getConversation(id: string): Promise<ConversationDetail> {
  const res = await laravelClient.get<ConversationDetail>(
    `assistant/conversations/${id}`,
  );
  return res.data;
}

/** Renomme une conversation. */
export async function renameConversation(
  id: string,
  title: string,
): Promise<ConversationSummary> {
  const res = await laravelClient.put<ConversationSummary>(
    `assistant/conversations/${id}`,
    { title },
  );
  return res.data;
}

/** Supprime une conversation et tous ses messages. */
export async function deleteConversation(id: string): Promise<void> {
  await laravelClient.delete(`assistant/conversations/${id}`);
}

// ---------------------------------------------------------------------------
// Feedback 👍/👎 sur une réponse de l'assistant
// ---------------------------------------------------------------------------

/** Enregistre (ou met à jour) l'avis de l'utilisateur sur un message assistant. */
export async function sendFeedback(
  messageId: string,
  rating: FeedbackRating,
  comment?: string,
): Promise<void> {
  await laravelClient.post(`assistant/messages/${messageId}/feedback`, {
    rating,
    ...(comment ? { comment } : {}),
  });
}

/** Retire l'avis de l'utilisateur sur un message assistant. */
export async function clearFeedback(messageId: string): Promise<void> {
  await laravelClient.delete(`assistant/messages/${messageId}/feedback`);
}

// ---------------------------------------------------------------------------
// Références épinglables (sélecteur « @ » du composer)
// ---------------------------------------------------------------------------

/**
 * Recherche des documents publiés épinglables comme périmètre de recherche
 * (codes, lois, constitution…). Sans `q`, renvoie les textes principaux.
 */
export async function searchReferences(
  q: string,
): Promise<AssistantReference[]> {
  const res = await laravelClient.get<{ data: AssistantReference[] }>(
    'assistant/references',
    { params: { q: q || undefined } },
  );
  return res.data?.data ?? [];
}

// ---------------------------------------------------------------------------
// Chat — Streaming SSE
// ---------------------------------------------------------------------------

export interface StreamChatParams {
  message: string;
  /** Conversation existante à poursuivre ; absent => création d'une nouvelle. */
  conversationId?: string | null;
  /** Mode de réponse (`concise` par défaut côté backend). */
  mode?: AssistantMode;
  /** Documents épinglés restreignant la recherche de l'IA. */
  references?: AssistantReference[];
  /** Permet d'annuler la requête (bouton "Stop"). */
  signal?: AbortSignal;
}

/**
 * Découpe un buffer SSE brut en évènements `{ event, data }`.
 *
 * Le backend Laravel émet des trames de la forme :
 *   event: sources\n data: [...]\n\n
 *   data: {"type":"text_delta","delta":"..."}\n\n   (évènement par défaut "message")
 *   data: [DONE]\n\n
 */
function parseSseFrame(frame: string): { event: string; data: string } | null {
  const lines = frame.split('\n');
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }

  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

/**
 * Envoie un message à l'IA et consomme la réponse en streaming (SSE).
 *
 * Branche chaque type d'évènement sur le callback correspondant :
 * statut, sources (citations), fragments de texte, erreurs, fin.
 *
 * @returns une promesse résolue à la fin du flux.
 */
export async function streamChat(
  { message, conversationId, mode, references, signal }: StreamChatParams,
  callbacks: StreamCallbacks,
): Promise<void> {
  const token = getStoredToken();
  // Pas de slash final quand aucune conversation n'existe encore (route id?).
  const url = conversationId
    ? `${laravelBaseUrl}/assistant/chat/${conversationId}`
    : `${laravelBaseUrl}/assistant/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({
      message,
      stream: true,
      ...(mode && mode !== 'concise' ? { mode } : {}),
      ...(references && references.length > 0
        ? {
            references: references.map((ref) => ({
              id: ref.id,
              type: 'document',
            })),
          }
        : {}),
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    let detail = `Erreur ${response.status}`;
    try {
      const payload = await response.json();
      detail = payload?.message || detail;
    } catch {
      /* corps non JSON — on garde le code HTTP */
    }
    throw new Error(detail);
  }

  // L'identifiant de conversation (créée si premier message) revient en en-tête.
  const newId = response.headers.get('X-Conversation-Id');
  if (newId) callbacks.onConversationId?.(newId);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Lecture incrémentale : on accumule jusqu'à un séparateur de trame "\n\n".
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? ''; // dernière trame potentiellement incomplète

    for (const rawFrame of frames) {
      if (!rawFrame.trim()) continue;
      const parsed = parseSseFrame(rawFrame);
      if (!parsed) continue;

      const { event, data } = parsed;

      if (data === '[DONE]') {
        callbacks.onDone?.();
        return;
      }

      try {
        switch (event) {
          case 'status': {
            const payload = JSON.parse(data);
            callbacks.onStatus?.(payload.message ?? '');
            break;
          }
          case 'sources': {
            const sources = JSON.parse(data);
            if (Array.isArray(sources)) callbacks.onSources?.(sources);
            break;
          }
          case 'error': {
            const payload = JSON.parse(data);
            callbacks.onError?.(payload.message ?? 'Erreur inconnue');
            break;
          }
          case 'meta': {
            const payload = JSON.parse(data);
            if (typeof payload.message_id === 'string') {
              callbacks.onMessageId?.(payload.message_id);
            }
            break;
          }
          // Évènement par défaut "message" => fragment de texte.
          default: {
            const payload = JSON.parse(data);
            if (payload.type === 'text_delta' && typeof payload.delta === 'string') {
              callbacks.onDelta?.(payload.delta);
            }
          }
        }
      } catch {
        // Trame JSON malformée — on l'ignore pour ne pas casser le flux.
      }
    }
  }

  callbacks.onDone?.();
}

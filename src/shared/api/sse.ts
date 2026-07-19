/**
 * sse.ts — Primitives partagées de consommation de flux SSE (Server-Sent Events).
 *
 * Trois features consommaient un flux SSE avec des parseurs quasi identiques
 * (Assistant IA, Bibliothèque IA, notifications d'ingestion). Le cœur — découpe
 * des trames et lecture incrémentale du `ReadableStream` — est factorisé ici ;
 * chaque appelant ne conserve que ce qui lui est propre (dispatch des événements,
 * politique de reconnexion, en-têtes).
 *
 * Pourquoi `fetch` + `ReadableStream` plutôt que `EventSource` natif :
 *  - `EventSource` ne sait pas émettre de POST avec un corps (Assistant/Biblio) ;
 *  - `EventSource` ne porte pas l'en-tête `Authorization: Bearer` (flux Python).
 */

import { getStoredToken } from '@/shared/auth/tokenAccess';

/** Une trame SSE décodée : nom d'événement (`message` par défaut) + données. */
export interface SseFrame {
  event: string;
  data: string;
}

/**
 * Découpe une trame SSE brute (déjà séparée par `\n\n`) en `{ event, data }`.
 *
 * - `event:` fixe le nom d'événement (défaut : `message`) ;
 * - chaque `data:` est concaténé (les corps multilignes deviennent `\n`-joints) ;
 * - une trame sans `data:` (heartbeat/commentaire `": ping"`) renvoie `null`.
 */
export function parseSseFrame(frame: string): SseFrame | null {
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of frame.split('\n')) {
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
 * Lit un `ReadableStream` de réponse SSE et invoque `onFrame` pour chaque trame
 * valide (accumulation jusqu'au séparateur `\n\n`, dernière trame potentiellement
 * incomplète conservée dans le buffer).
 *
 * Ne gère ni les en-têtes, ni les erreurs HTTP, ni la fin logique du flux
 * (`[DONE]`) : c'est au ressort de l'appelant. Retourne quand le serveur clôt
 * le flux (`done`).
 */
export async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onFrame: (frame: SseFrame) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? ''; // dernière trame potentiellement incomplète

    for (const rawFrame of frames) {
      if (!rawFrame.trim()) continue;
      const parsed = parseSseFrame(rawFrame);
      if (parsed) onFrame(parsed);
    }
  }
}

/** Sentinelle de fin de flux émise par le backend (`data: [DONE]`). */
export const SSE_DONE = '[DONE]';

export interface SsePostOptions {
  /** URL absolue de l'endpoint SSE. */
  url: string;
  /** Corps JSON de la requête POST. */
  body: unknown;
  /** Permet d'annuler la requête (bouton « Stop »). */
  signal?: AbortSignal;
  /**
   * Hook synchrone appelé une fois la réponse OK reçue, avant la lecture du flux
   * (ex. lecture d'un en-tête `X-Conversation-Id`).
   */
  onResponse?: (response: Response) => void;
  /** Traite chaque trame décodée. Retourner `true` interrompt la lecture (`[DONE]`). */
  onFrame: (frame: SseFrame) => boolean | void;
}

/**
 * Ouvre un flux SSE en POST (JSON) et le consomme jusqu'au bout.
 *
 * Comportement mutualisé entre l'Assistant et la Bibliothèque :
 *  - en-têtes JSON + `Accept: text/event-stream` + `Authorization: Bearer` ;
 *  - `credentials: 'include'` (cookies de session Sanctum) ;
 *  - en cas de statut non-OK : tente de lire un message d'erreur JSON, sinon
 *    retombe sur le code HTTP, et lève une `Error` porteuse de ce message ;
 *  - lit les trames via {@link readSseStream} ; `onFrame` renvoyant `true`
 *    (typiquement sur `[DONE]`) arrête proprement la lecture.
 */
export async function openSsePost({
  url,
  body,
  signal,
  onResponse,
  onFrame,
}: SsePostOptions): Promise<void> {
  const token = getStoredToken();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
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

  onResponse?.(response);

  let stopped = false;
  await readSseStream(response.body, (frame) => {
    if (stopped) return;
    if (onFrame(frame) === true) stopped = true;
  });
}

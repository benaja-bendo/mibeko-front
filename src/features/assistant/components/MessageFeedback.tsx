/**
 * MessageFeedback.tsx — Avis 👍/👎 sur une réponse de l'assistant.
 *
 * État local optimiste (restitué depuis l'historique) : un re-clic sur l'avis
 * actif le retire. En cas d'échec réseau, on revient discrètement à l'état
 * précédent — un feedback est secondaire, il ne doit jamais bloquer la lecture.
 */

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import {
  clearFeedback,
  sendFeedback,
} from '@/features/assistant/api/assistantApi';
import type { FeedbackRating } from '@/features/assistant/types';

interface MessageFeedbackProps {
  /** Identifiant backend du message assistant à noter. */
  messageId: string;
  /** Avis initial (restitué depuis l'historique). */
  initialRating?: FeedbackRating | null;
}

export default function MessageFeedback({
  messageId,
  initialRating = null,
}: MessageFeedbackProps) {
  const [rating, setRating] = useState<FeedbackRating | null>(initialRating);
  const [busy, setBusy] = useState(false);

  const apply = async (next: FeedbackRating) => {
    if (busy) return;
    const previous = rating;
    const target = rating === next ? null : next; // re-clic = retrait
    setRating(target);
    setBusy(true);
    try {
      if (target) {
        await sendFeedback(messageId, target);
      } else {
        await clearFeedback(messageId);
      }
    } catch {
      setRating(previous); // revert silencieux
    } finally {
      setBusy(false);
    }
  };

  const buttonClass = (active: boolean) =>
    `flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-50 ${
      active ? 'bg-s3 text-gold' : 'text-t3 hover:bg-s2 hover:text-t1'
    }`;

  return (
    <div className="mt-2 flex items-center gap-1">
      <button
        type="button"
        onClick={() => apply('up')}
        disabled={busy}
        title="Réponse utile"
        aria-label="Réponse utile"
        aria-pressed={rating === 'up'}
        className={buttonClass(rating === 'up')}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => apply('down')}
        disabled={busy}
        title="Réponse à améliorer"
        aria-label="Réponse à améliorer"
        aria-pressed={rating === 'down'}
        className={buttonClass(rating === 'down')}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

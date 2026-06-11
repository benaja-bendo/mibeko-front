/**
 * ChatMessage.tsx — Affichage d'un message du fil de discussion.
 *
 * - Message utilisateur : bulle compacte alignée à droite.
 * - Message assistant : pleine largeur, rendu Markdown, statut de recherche,
 *   curseur clignotant pendant le streaming, puis cartes de citations.
 */

import { useRef } from 'react';
import {
  Sparkles,
  User,
  Loader2,
  AlertTriangle,
  BookMarked,
  Layers,
} from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/features/assistant/types';
import MarkdownLite from './MarkdownLite';
import SourceCitations, {
  type SourceCitationsHandle,
} from './SourceCitations';

interface ChatMessageProps {
  message: ChatMessageType;
  /** Statut transitoire (ex. "Recherche…") affiché si la réponse est vide. */
  status?: string | null;
}

export default function ChatMessage({ message, status }: ChatMessageProps) {
  const sourcesRef = useRef<SourceCitationsHandle>(null);
  const isUser = message.role === 'user';

  if (isUser) {
    const hasContext =
      (message.references?.length ?? 0) > 0 || message.mode === 'analysis';

    return (
      <div className="flex justify-end gap-3">
        <div className="flex max-w-[80%] flex-col items-end gap-1">
          {/* Contexte de la demande : périmètre ciblé et/ou mode analyse */}
          {hasContext && (
            <div className="flex flex-wrap justify-end gap-1">
              {message.mode === 'analysis' && (
                <span className="flex items-center gap-1 rounded-full border border-b1 bg-s1 px-2 py-0.5 text-[10px] text-t3">
                  <Layers className="h-2.5 w-2.5 text-gold" />
                  Analyse approfondie
                </span>
              )}
              {message.references?.map((ref) => (
                <span
                  key={ref.id}
                  className="flex max-w-[220px] items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[10px] text-t2"
                >
                  <BookMarked className="h-2.5 w-2.5 shrink-0 text-gold" />
                  <span className="truncate">{ref.title}</span>
                </span>
              ))}
            </div>
          )}
          <div className="rounded-2xl rounded-tr-sm border border-b1 bg-s2 px-4 py-2.5 text-sm leading-relaxed text-t1 whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-s3 text-t2">
          <User className="h-3.5 w-3.5" />
        </div>
      </div>
    );
  }

  /** Amène à l'écran la source [n] cliquée dans la réponse, et la surligne. */
  const handleCitationClick = (index: number) => {
    sourcesRef.current?.scrollToSource(index);
  };

  const showStatus = !!status && !message.content;
  const showTypingCursor = message.pending && !!message.content;

  return (
    <div className="flex gap-3">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
          message.error
            ? 'border-red/30 bg-red-d text-red'
            : 'border-gold/20 bg-gold/10 text-gold'
        }`}
      >
        {message.error ? (
          <AlertTriangle className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        {showStatus ? (
          <div className="flex items-center gap-2 text-sm text-t3">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
            <span>{status}</span>
          </div>
        ) : message.pending && !message.content ? (
          <div className="flex items-center gap-1.5 py-1 text-t3">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-t3 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-t3 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-t3" />
          </div>
        ) : (
          <div className={message.error ? 'text-red' : ''}>
            <MarkdownLite
              content={message.content}
              onCitationClick={handleCitationClick}
            />
            {showTypingCursor && (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-gold align-text-bottom" />
            )}
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <SourceCitations ref={sourcesRef} sources={message.sources} />
        )}
      </div>
    </div>
  );
}

/**
 * ChatMessage.tsx — Affichage d'un message du fil de discussion.
 *
 * - Message utilisateur : bulle compacte alignée à droite.
 * - Message assistant : pleine largeur, rendu Markdown, statut de recherche,
 *   curseur clignotant pendant le streaming, puis cartes de citations.
 */

import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  User,
  Loader2,
  AlertTriangle,
  BookMarked,
  Layers,
  SearchX,
  RotateCcw,
  Copy,
  ChevronDown,
} from 'lucide-react';
import type {
  AssistantSource,
  ChatMessage as ChatMessageType,
} from '@/features/assistant/types';
import MarkdownLite from './MarkdownLite';
import MessageFeedback from './MessageFeedback';
import CitationPreview from './CitationPreview';
import SourceCitations, {
  type SourceCitationsHandle,
} from './SourceCitations';
import { buildMentionMatcher } from '../lib/sourceMentions';
import { answerWithSources } from '../lib/answerWithSources';
import { toast } from '@/shared/store/useToast';

interface ChatMessageProps {
  message: ChatMessageType;
  /** Statut transitoire (ex. "Recherche…") affiché si la réponse est vide. */
  status?: string | null;
  onRetry?: () => void;
}

export default function ChatMessage({ message, status, onRetry }: ChatMessageProps) {
  const sourcesRef = useRef<SourceCitationsHandle>(null);
  const sourcesDetailsRef = useRef<HTMLDetailsElement>(null);
  const navigate = useNavigate();

  // Détecteur de mentions de sources (titres de documents, « article N »).
  // Appelé inconditionnellement — avant tout retour anticipé — pour respecter
  // les règles des hooks ; renvoie null pour un message utilisateur ou une
  // réponse sans sources.
  const mentionMatcher = useMemo(
    () => buildMentionMatcher(message.sources),
    [message.sources],
  );

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

  const sourceAt = (index: number): AssistantSource | undefined =>
    message.sources?.[index - 1];

  const citedNumbers = [...new Set(
    [...message.content.matchAll(/\[(\d+)\]/g)]
      .map((match) => Number(match[1]))
      .filter((number) => sourceAt(number)),
  )];
  const showSources = !message.pending && !message.error && !message.interrupted && citedNumbers.length > 0;

  const locateSource = (index: number) => {
    if (sourcesDetailsRef.current) {
      sourcesDetailsRef.current.open = true;
      sourcesRef.current?.scrollToSource(index);
    }
  };

  /** Ouvre l'article cité dans le reader de la Bibliothèque. */
  const openSourceInLibrary = (source: AssistantSource) => {
    const params = new URLSearchParams();
    if (source.document_id) params.set('doc', source.document_id);
    if (source.id) params.set('article', source.id);
    navigate(`/app/library?${params.toString()}`);
  };

  /**
   * Clic sur un marqueur [n] : ouvre directement la lecture (l'aperçu au
   * survol couvre le besoin de contexte rapide) ; repli sur le défilement
   * vers la carte source si la source n'est pas résolue.
   */
  const handleCitationClick = (index: number) => {
    const source = sourceAt(index);
    if (source?.document_id) {
      openSourceInLibrary(source);
    } else {
      locateSource(index);
    }
  };

  /** Aperçu au survol du marqueur [n] (desktop). */
  const renderCitation = (index: number, marker: React.ReactElement) => {
    const source = sourceAt(index);
    if (!source) return marker;
    return (
      <CitationPreview
        index={index}
        source={source}
        onRead={() => handleCitationClick(index)}
        onLocate={showSources ? () => locateSource(index) : undefined}
      >
        {marker}
      </CitationPreview>
    );
  };

  /**
   * Enrobe les mentions de sources d'un aperçu au survol (même hovercard que
   * les marqueurs [n]). `seenMentions` est recréé à chaque rendu : on n'enrobe
   * que la PREMIÈRE occurrence de chaque source sur l'ensemble du message.
   */
  const seenMentions = new Set<number>();
  const linkifyText = mentionMatcher
    ? (text: string, keyPrefix: string): React.ReactNode => {
        const matches = mentionMatcher.findMatches(text).filter((match) => {
          if (seenMentions.has(match.index)) return false;
          seenMentions.add(match.index);
          return true;
        });
        if (matches.length === 0) return text;

        const nodes: React.ReactNode[] = [];
        let cursor = 0;
        matches.forEach((match, i) => {
          if (match.start > cursor) {
            nodes.push(text.slice(cursor, match.start));
          }
          nodes.push(
            <CitationPreview
              key={`${keyPrefix}-mention-${i}`}
              index={match.index}
              source={match.source}
              onRead={() => handleCitationClick(match.index)}
              onLocate={showSources && citedNumbers.includes(match.index) ? () => locateSource(match.index) : undefined}
            >
              <button
                type="button"
                onClick={() => handleCitationClick(match.index)}
                className="border-b border-dotted border-gold/40 text-t1 transition-colors hover:border-gold hover:text-gold"
              >
                {match.text}
              </button>
            </CitationPreview>,
          );
          cursor = match.end;
        });
        if (cursor < text.length) {
          nodes.push(text.slice(cursor));
        }
        return nodes;
      }
    : undefined;

  const showStatus = !!status && message.pending && !message.error && !message.content;
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
              renderCitation={renderCitation}
              linkifyText={linkifyText}
            />
            {showTypingCursor && (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-gold align-text-bottom" />
            )}
          </div>
        )}

        {(message.error || message.interrupted) && !message.pending && (
          <div role="status" className="mt-3 rounded-lg border border-b1 bg-s2 px-3 py-3">
            <p className="text-sm font-medium text-t1">
              {message.error ? 'Réponse interrompue' : 'Génération arrêtée'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-t2">
              {message.errorMessage ?? (message.error
                ? 'La réponse n’a pas pu être terminée. Vous pouvez réessayer la même question.'
                : 'Le texte affiché peut être incomplet. Rechargez la conversation pour retrouver la réponse si le serveur a terminé.')}
            </p>
            {onRetry && message.error && (
              <button type="button" onClick={onRetry}
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-gold hover:text-t1">
                <RotateCcw className="h-3.5 w-3.5" /> Réessayer la question
              </button>
            )}
          </div>
        )}

        {/* Non-réponse assumée : le corpus a été interrogé et n'a rien rendu.
            L'état est explicite plutôt que déduit d'une réponse courte — c'est
            la contrepartie visible de la règle qui interdit à l'assistant de
            compléter de mémoire (mibeko-dashboard#15). */}
        {message.noResult && !message.pending && !message.error && (
          <div className="mt-3 rounded-lg border border-b1 bg-s2 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <SearchX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-t3" />
              <div className="min-w-0 space-y-1.5">
                <p className="text-xs font-medium text-t2">
                  Aucun extrait pertinent trouvé pour cette recherche
                </p>
                <p className="text-xs leading-relaxed text-t3">
                  La recherche n'a rien trouvé, et l'assistant ne complète jamais
                  de mémoire. Essayez les mots exacts du texte plutôt que la
                  notion, ou vérifiez dans la Bibliothèque que le texte visé y
                  est déjà publié.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/app/library')}
                  className="text-xs font-medium text-gold transition-colors hover:text-t1"
                >
                  Parcourir la Bibliothèque
                </button>
              </div>
            </div>
          </div>
        )}

        {showSources && message.sources && (
          <details ref={sourcesDetailsRef} className="group/sources mt-3 rounded-lg border border-b1 bg-s1">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-medium text-t2 hover:text-t1 [&::-webkit-details-marker]:hidden">
              <BookMarked className="h-3.5 w-3.5 text-gold" />
              Sources citées ({citedNumbers.length})
              <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-open/sources:rotate-180" />
            </summary>
            <div className="px-3 pb-3">
              <SourceCitations ref={sourcesRef} sources={message.sources} visibleNumbers={citedNumbers} />
            </div>
          </details>
        )}

        {!message.pending && !message.error && !message.interrupted && message.content && (
          <button type="button" className="mt-3 inline-flex items-center gap-1.5 text-xs text-t3 hover:text-t1"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(answerWithSources(message, window.location.origin));
                toast.success('Réponse et références copiées');
              } catch {
                toast.error('La copie est indisponible. Sélectionnez le texte pour le copier.');
              }
            }}>
            <Copy className="h-3.5 w-3.5" /> Copier la réponse et ses références
          </button>
        )}

        {/* Avis 👍/👎 : une fois la réponse terminée et son id backend connu
            (historique, ou émis en fin de flux pour une réponse fraîche). */}
        {!message.pending && !message.error && !message.interrupted && message.backendId && (
          <MessageFeedback
            key={message.backendId}
            messageId={message.backendId}
            initialRating={message.feedback ?? null}
          />
        )}
      </div>
    </div>
  );
}

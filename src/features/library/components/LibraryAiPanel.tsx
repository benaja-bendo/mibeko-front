/**
 * LibraryAiPanel.tsx — Surface IA « à la demande » du panneau droit.
 *
 * Affiche le flux streamé d'une explication d'article ou d'une synthèse de
 * recherche (cf. {@link useLibraryAi}). La fermeture demande confirmation tant
 * qu'un texte généré n'a pas été sauvegardé, conformément au besoin métier :
 * l'utilisateur garde la main et ne perd pas une synthèse par inadvertance.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  FileText,
  ArrowUpRight,
  MessageSquarePlus,
  Loader2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import MarkdownLite from '@/features/assistant/components/MarkdownLite';
import type { LibraryAiState } from '@/features/library/hooks/useLibrary';
import type { SearchResultItem } from '@/features/library/types';

interface LibraryAiPanelProps {
  state: LibraryAiState;
  /** Ferme le panneau (déjà confirmé si nécessaire). */
  onClose: () => void;
  /** Ouvre une source dans le panneau de lecture. */
  onOpenSource: (item: SearchResultItem) => void;
  /** Relance la requête courante. */
  onRetry: () => void;
}

/** Extrait court pour l'aperçu d'une source. */
function snippet(text?: string | null, max = 150): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

export default function LibraryAiPanel({
  state,
  onClose,
  onOpenSource,
  onRetry,
}: LibraryAiPanelProps) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const { request, status, sources, text, isStreaming, error } = state;
  const isExplain = request?.kind === 'explain';

  const title = isExplain ? 'Explication IA' : 'Synthèse Mibeko IA';
  const subtitle =
    request?.kind === 'explain'
      ? `${request.documentTitle}${request.articleNumber ? ` · Art. ${request.articleNumber}` : ''}`
      : request?.kind === 'synthesis'
        ? `« ${request.q} »`
        : '';

  // Fermeture : confirmer seulement si un texte a été généré (et non en erreur).
  const requestClose = () => {
    if (text.trim().length > 0 && !error) {
      setConfirming(true);
    } else {
      onClose();
    }
  };

  const deepenInAssistant = () => {
    const q =
      request?.kind === 'explain'
        ? `Explique l'article ${request.articleNumber ?? ''} de « ${request.documentTitle} »`
        : request?.kind === 'synthesis'
          ? request.q
          : '';
    navigate(`/app/assistant?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* En-tête */}
      <header className="shrink-0 border-b border-b1 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold/15">
              <Sparkles className="h-4 w-4 text-gold" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-t1">
                {title}
              </h2>
              {subtitle && (
                <p className="truncate text-xs text-t3" title={subtitle}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={requestClose}
            title="Fermer"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-t3 transition-colors hover:bg-s2 hover:text-t1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Barre de confirmation de fermeture */}
      {confirming && (
        <div className="flex items-center justify-between gap-3 border-b border-gold/20 bg-gold/[0.06] px-4 py-2">
          <span className="text-xs text-t2">
            Fermer ? Le texte généré ne sera pas conservé.
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md border border-b1 bg-s1 px-2.5 py-1 text-[11px] font-medium text-t2 transition-colors hover:text-t1"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-gold px-2.5 py-1 text-[11px] font-semibold text-[#120e00] transition-opacity hover:opacity-90"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Corps */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 py-5">
          {/* Statut de streaming */}
          {isStreaming && (
            <div className="mb-3 flex items-center gap-2 text-xs text-t3">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
              {status || 'Génération en cours…'}
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-red/30 bg-red/[0.06] p-4">
              <div className="flex items-center gap-2 text-sm text-t1">
                <AlertTriangle className="h-4 w-4 text-red" />
                {error}
              </div>
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1.5 rounded-lg border border-b1 bg-s1 px-2.5 py-1.5 text-[11px] font-medium text-t2 transition-colors hover:text-t1"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Réessayer
              </button>
            </div>
          )}

          {/* Réponse */}
          {!error && (
            <div className="text-[15px] leading-7 text-t1/90">
              {text ? (
                <MarkdownLite content={text} />
              ) : (
                isStreaming && (
                  <div className="space-y-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-s2" />
                    <div className="h-3 w-full animate-pulse rounded bg-s2" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-s2" />
                  </div>
                )
              )}
              {isStreaming && text && (
                <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-gold align-middle" />
              )}
            </div>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-t3">
                <span className="h-px flex-1 bg-b1" />
                {sources.length} source{sources.length > 1 ? 's' : ''} juridique
                {sources.length > 1 ? 's' : ''}
                <span className="h-px flex-1 bg-b1" />
              </div>

              <div className="grid gap-2">
                {sources.map((source, i) => (
                  <button
                    key={source.id || i}
                    type="button"
                    onClick={() => onOpenSource(source)}
                    className="group flex flex-col gap-1.5 rounded-lg border border-b1 bg-s1 p-3 text-left transition-colors hover:border-gold/30 hover:bg-s2"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium text-t1">
                      <span className="flex h-5 min-w-5 items-center justify-center rounded bg-gold/15 px-1.5 text-[10px] font-semibold text-gold">
                        {i + 1}
                      </span>
                      <FileText className="h-3.5 w-3.5 shrink-0 text-gold" />
                      <span className="truncate">
                        {source.document_title || 'Document'}
                        {source.number ? ` · Art. ${source.number}` : ''}
                      </span>
                      <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-t3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    {source.content && (
                      <p className="line-clamp-2 text-[11px] leading-snug text-t2">
                        {snippet(source.content)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pied : disclaimer + approfondir */}
      {!error && (
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-b1 px-4 py-2.5">
          <p className="text-[10px] text-t4">
            Vérifiez les références dans les textes officiels.
          </p>
          <button
            type="button"
            onClick={deepenInAssistant}
            className="flex items-center gap-1.5 rounded-lg border border-b1 bg-s1 px-2.5 py-1.5 text-[11px] font-medium text-t2 transition-colors hover:bg-s2 hover:text-t1"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Approfondir avec l'Assistant
          </button>
        </footer>
      )}
    </div>
  );
}

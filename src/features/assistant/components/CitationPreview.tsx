/**
 * CitationPreview.tsx — Aperçu « type Wikipédia » d'une source citée [n].
 *
 * Au survol d'un marqueur [n] dans la réponse de l'IA, montre immédiatement
 * de quoi parle la source (titre du texte, fil d'Ariane, extrait) sans
 * quitter la conversation, avec deux suites possibles : lire l'article dans
 * la Bibliothèque ou localiser la carte source sous la réponse. Aucune
 * requête réseau : toutes les données sont déjà dans la réponse de l'IA.
 */
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/shared/components/ui/HoverCard';
import type { AssistantSource } from '@/features/assistant/types';
import { BookOpenText, FileText, MapPin } from 'lucide-react';
import { displayArticleNumber } from '@/shared/lib/legalLabels';

interface CitationPreviewProps {
  index: number;
  source: AssistantSource;
  /** Ouvre l'article dans le reader de la Bibliothèque. */
  onRead: () => void;
  /** Fait défiler jusqu'à la carte source n sous la réponse. */
  onLocate: () => void;
  /** Le marqueur [n] qui sert de déclencheur. */
  children: React.ReactNode;
}

/** Tronque l'extrait de l'aperçu (plus généreux que la carte source). */
function excerpt(text?: string | null, max = 320): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

export default function CitationPreview({
  index,
  source,
  onRead,
  onLocate,
  children,
}: CitationPreviewProps) {
  return (
    <HoverCard openDelay={250} closeDelay={120}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80" side="top" align="start">
        {/* En-tête : numéro + type + article */}
        <div className="flex items-center gap-1.5 border-b border-b1 px-3.5 py-2.5">
          <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-gold/15 px-1.5 text-[10px] font-bold text-gold">
            {index}
          </span>
          {source.document_type && (
            <span className="rounded bg-s3 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-t3">
              {source.document_type}
            </span>
          )}
          {source.number && (
            <span className="rounded bg-s3 px-1.5 py-0.5 font-mono text-[9px] text-t2">
              Art. {displayArticleNumber(source.number)}
            </span>
          )}
        </div>

        <div className="px-3.5 py-3">
          {/* Titre du texte */}
          <p className="flex items-start gap-1.5 text-xs font-semibold leading-snug text-t1">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
            <span className="line-clamp-2">{source.document_title || 'Document'}</span>
          </p>

          {/* Fil d'Ariane */}
          {source.breadcrumb && (
            <p className="mt-1.5 truncate font-mono text-[10px] text-t3">
              {source.breadcrumb}
            </p>
          )}

          {/* Extrait */}
          {source.content && (
            <p className="mt-2 border-l-2 border-gold/30 pl-2.5 font-serif text-[11.5px] leading-relaxed text-t2">
              {excerpt(source.content)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-b1 px-3.5 py-2.5">
          <button
            type="button"
            onClick={onRead}
            className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold px-2.5 text-[11px] font-semibold text-on-gold transition-opacity hover:opacity-90"
          >
            <BookOpenText className="h-3 w-3" /> Lire l'article
          </button>
          <button
            type="button"
            onClick={onLocate}
            className="flex h-7 items-center justify-center gap-1.5 rounded-lg border border-b1 px-2.5 text-[11px] text-t2 transition-colors hover:bg-s2 hover:text-t1"
          >
            <MapPin className="h-3 w-3" /> Source
          </button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

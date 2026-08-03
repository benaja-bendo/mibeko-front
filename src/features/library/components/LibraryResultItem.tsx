/**
 * LibraryResultItem.tsx — Ligne de résultat de recherche (granularité article).
 *
 * Dense et lisible : fil d'Ariane, périmètre, numéro d'article, extrait avec
 * surlignage des termes, date et score. L'état « sélectionné » reflète le
 * document affiché dans le panneau de lecture.
 */

import { Fragment } from 'react';
import { FileText, FolderPlus, Check, Sparkles } from 'lucide-react';
import { SCOPE_LABELS, type SearchResultItem } from '@/features/library/types';
import { displayArticleNumber } from '@/shared/lib/legalLabels';

interface LibraryResultItemProps {
  item: SearchResultItem;
  query: string;
  onOpen: (item: SearchResultItem) => void;
  /** Demande une explication IA de cet article (panneau droit). */
  onExplain?: (item: SearchResultItem) => void;
  /** Document actuellement affiché dans le panneau de lecture. */
  active?: boolean;
  /** Active le bouton « Ajouter au dossier » (flux depuis un dossier). */
  onAddToDossier?: (item: SearchResultItem) => void;
  added?: boolean;
}

/** Surligne les termes de la requête (mots > 2 lettres) dans un extrait. */
function highlight(text: string, query: string): React.ReactNode {
  const terms = query
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((t) => t.length > 2);
  if (terms.length === 0) return text;

  const splitPattern = new RegExp(`(${terms.join('|')})`, 'gi');
  const testPattern = new RegExp(`^(${terms.join('|')})$`, 'i');
  return text.split(splitPattern).map((part, i) =>
    testPattern.test(part) ? (
      <mark key={i} className="rounded bg-gold/25 px-0.5 text-t1">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** Extrait court pour l'aperçu. */
function excerpt(content?: string | null, max = 240): string {
  if (!content) return '';
  const clean = content.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/** Formate une date ISO en année (compact). */
function year(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : String(d.getFullYear());
}

export default function LibraryResultItem({
  item,
  query,
  onOpen,
  onExplain,
  active,
  onAddToDossier,
  added,
}: LibraryResultItemProps) {
  const scorePct = Math.round((item.score ?? 0) * 100);
  const scope = item.legal_scope && item.legal_scope !== 'all' ? item.legal_scope : null;
  const pubYear = year(item.date_publication);

  return (
    <div
      className={`group rounded-xl border transition-colors ${
        active
          ? 'border-gold/40 bg-s2'
          : 'border-b1 bg-s1 hover:border-gold/30 hover:bg-s2'
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="block w-full p-3.5 text-left"
      >
        {/* Méta ligne : périmètre, institution, année */}
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          {scope && (
            <span className="rounded bg-gold/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-gold">
              {SCOPE_LABELS[scope]}
            </span>
          )}
          {item.breadcrumb && (
            <span className="truncate font-mono text-[10px] uppercase tracking-wide text-t3">
              {item.breadcrumb}
            </span>
          )}
        </div>

        {/* Titre */}
        <h3 className="flex items-center gap-2 text-sm font-semibold text-t1">
          <FileText className="h-3.5 w-3.5 shrink-0 text-gold" />
          <span className="truncate">{item.document_title || 'Document'}</span>
          {item.number && (
            <span className="shrink-0 rounded bg-s3 px-1.5 py-0.5 font-mono text-[10px] text-t2">
              Art. {displayArticleNumber(item.number)}
            </span>
          )}
        </h3>

        {/* Extrait */}
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-t2">
          {highlight(excerpt(item.content), query)}
        </p>
      </button>

      {/* Pied : score + année + ajout dossier */}
      <div className="flex items-center justify-between gap-2 px-3.5 pb-2.5">
        <div className="flex items-center gap-2 text-[10px] text-t4">
          {scorePct > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="font-mono">Pertinence</span>
              <span className="inline-block h-1 w-12 overflow-hidden rounded-full bg-s3">
                <span
                  className="block h-full rounded-full bg-gold/70"
                  style={{ width: `${Math.min(100, scorePct)}%` }}
                />
              </span>
            </span>
          )}
          {pubYear && <span className="font-mono">· {pubYear}</span>}
        </div>

        <div className="flex items-center gap-1.5">
          {onExplain && (
            <button
              type="button"
              onClick={() => onExplain(item)}
              title="Expliquer cet article avec l'IA"
              className="flex items-center gap-1 rounded-md border border-b1 bg-s2 px-2 py-1 text-[10px] font-medium text-t2 transition-colors hover:border-gold/30 hover:text-gold"
            >
              <Sparkles className="h-3 w-3" />
              Expliquer
            </button>
          )}

          {onAddToDossier && (
            <button
              type="button"
              onClick={() => onAddToDossier(item)}
              disabled={added}
              className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${
                added
                  ? 'border-green/30 bg-green-d text-green'
                  : 'border-b1 bg-s2 text-t2 hover:border-gold/30 hover:text-t1'
              }`}
            >
              {added ? (
                <>
                  <Check className="h-3 w-3" />
                  Ajouté
                </>
              ) : (
                <>
                  <FolderPlus className="h-3 w-3" />
                  Dossier
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * LibraryResultItem.tsx — Ligne de résultat de recherche (granularité article).
 *
 * Affiche le fil d'Ariane, le numéro d'article, un extrait pertinent avec
 * surlignage des termes recherchés, et un indicateur de score. Le clic ouvre
 * le document dans le lecteur, positionné sur l'article.
 */

import { Fragment } from 'react';
import { FileText, ChevronRight, FolderPlus, Check } from 'lucide-react';
import type { SearchResultItem } from '@/features/library/types';

interface LibraryResultItemProps {
  item: SearchResultItem;
  query: string;
  onOpen: (item: SearchResultItem) => void;
  /** Active le bouton "Ajouter au dossier" (flux depuis un dossier). */
  onAddToDossier?: (item: SearchResultItem) => void;
  /** Indique que la référence est déjà présente dans le dossier cible. */
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
  // Regex de test SANS flag `g` : `.test()` reste sans état dans la boucle.
  const testPattern = new RegExp(`^(${terms.join('|')})$`, 'i');
  const parts = text.split(splitPattern);

  return parts.map((part, i) =>
    testPattern.test(part) ? (
      <mark key={i} className="rounded bg-gold/25 px-0.5 text-t1">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** Extrait centré (les premières ~280 lettres suffisent pour un aperçu). */
function excerpt(content?: string | null, max = 280): string {
  if (!content) return '';
  const clean = content.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

export default function LibraryResultItem({
  item,
  query,
  onOpen,
  onAddToDossier,
  added,
}: LibraryResultItemProps) {
  const scorePct = Math.round((item.score ?? 0) * 100);

  return (
    <div className="group rounded-xl border border-b1 bg-s1 transition-colors hover:border-gold/30 hover:bg-s2">
      {/* Zone cliquable d'ouverture */}
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="block w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Fil d'Ariane */}
            {item.breadcrumb && (
              <p className="mb-1 truncate font-mono text-[10px] uppercase tracking-wide text-t3">
                {item.breadcrumb}
              </p>
            )}

            {/* Titre : document · article */}
            <h3 className="flex items-center gap-2 text-sm font-semibold text-t1">
              <FileText className="h-3.5 w-3.5 shrink-0 text-gold" />
              <span className="truncate">
                {item.document_title || 'Document'}
              </span>
              {item.number && (
                <span className="shrink-0 rounded bg-s3 px-1.5 py-0.5 font-mono text-[10px] text-t2">
                  Art. {item.number}
                </span>
              )}
            </h3>
          </div>

          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-t3 transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
        </div>

        {/* Extrait */}
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-t2">
          {highlight(excerpt(item.content), query)}
        </p>
      </button>

      {/* Pied : pertinence + ajout au dossier */}
      <div className="flex items-center justify-between gap-2 px-4 pb-3">
        {scorePct > 0 ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-t4">Pertinence</span>
            <div className="h-1 w-20 overflow-hidden rounded-full bg-s3">
              <div
                className="h-full rounded-full bg-gold/70"
                style={{ width: `${Math.min(100, scorePct)}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-t3">{scorePct}%</span>
          </div>
        ) : (
          <span />
        )}

        {onAddToDossier && (
          <button
            type="button"
            onClick={() => onAddToDossier(item)}
            disabled={added}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              added
                ? 'border-green/30 bg-green-d text-green'
                : 'border-b1 bg-s2 text-t2 hover:border-gold/30 hover:text-t1'
            }`}
          >
            {added ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Ajouté
              </>
            ) : (
              <>
                <FolderPlus className="h-3.5 w-3.5" />
                Ajouter au dossier
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * SourceCitations.tsx — Affiche les citations juridiques d'une réponse de l'IA.
 *
 * Chaque source est cliquable et renvoie vers la Bibliothèque Juridique, en
 * ouvrant directement le document concerné et en surlignant l'article cité
 * (paramètres d'URL `doc` et `article`).
 */

import { useNavigate } from 'react-router-dom';
import { forwardRef } from 'react';
import { FileText, ArrowUpRight } from 'lucide-react';
import type { AssistantSource } from '@/features/assistant/types';

interface SourceCitationsProps {
  sources: AssistantSource[];
}

/** Tronque un extrait pour l'aperçu d'une carte de citation. */
function snippet(text?: string | null, max = 160): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

const SourceCitations = forwardRef<HTMLDivElement, SourceCitationsProps>(
  ({ sources }, ref) => {
    const navigate = useNavigate();

    if (!sources.length) return null;

    const openInLibrary = (source: AssistantSource) => {
      const params = new URLSearchParams();
      if (source.document_id) params.set('doc', source.document_id);
      if (source.id) params.set('article', source.id);
      navigate(`/app/library?${params.toString()}`);
    };

    return (
      <div ref={ref} className="mt-3 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-t3">
          <span className="h-px flex-1 bg-b1" />
          {sources.length} source{sources.length > 1 ? 's' : ''} juridique
          {sources.length > 1 ? 's' : ''}
          <span className="h-px flex-1 bg-b1" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {sources.map((source, i) => (
            <button
              key={source.id || i}
              type="button"
              onClick={() => openInLibrary(source)}
              className="group flex flex-col gap-1.5 rounded-lg border border-b1 bg-s2 p-3 text-left transition-colors hover:border-gold/30 hover:bg-s3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-5 min-w-5 items-center justify-center rounded bg-gold/15 px-1.5 text-[10px] font-semibold text-gold">
                  {i + 1}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-t3 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-medium text-t1">
                <FileText className="h-3.5 w-3.5 shrink-0 text-gold" />
                <span className="truncate">
                  {source.document_title || 'Document'}
                  {source.number ? ` · Art. ${source.number}` : ''}
                </span>
              </div>

              {source.breadcrumb && (
                <p className="truncate text-[10px] font-mono text-t3">
                  {source.breadcrumb}
                </p>
              )}

              <p className="line-clamp-2 text-[11px] leading-snug text-t2">
                {snippet(source.content)}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  },
);

SourceCitations.displayName = 'SourceCitations';
export default SourceCitations;

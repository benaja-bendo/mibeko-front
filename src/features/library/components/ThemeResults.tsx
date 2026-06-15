import { X, FileText } from 'lucide-react';
import { useThemeDocuments } from '@/features/library/hooks/useThemes';
import { DocumentCard } from '@/features/library/components/LibraryHomeView';
import { themeIcon } from '@/features/library/components/themeIcon';
import type { LibraryHomeDocument } from '@/features/library/types';

/**
 * Vue « Parcourir par thème » : liste des textes (documents) rattachés à un
 * thème. C'est un parcours documentaire — distinct de la recherche full-text
 * d'articles (qui, elle, exige une requête texte).
 */
export default function ThemeResults({
  slug,
  onOpenDocument,
  onClear,
}: {
  slug: string;
  onOpenDocument: (doc: LibraryHomeDocument) => void;
  onClear: () => void;
}) {
  const { data, isLoading, isError } = useThemeDocuments(slug);
  const documents = data?.documents ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
            {themeIcon(data?.theme.icon, 'w-4 h-4')}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-t1 truncate">{data?.theme.name ?? 'Thème'}</p>
            {data?.theme.description && (
              <p className="text-[11px] text-t3 truncate">{data.theme.description}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 shrink-0 rounded-lg border border-b1 bg-s1 px-2 py-1 text-[11px] text-t3 transition-colors hover:text-gold"
        >
          <X className="h-3.5 w-3.5" /> Effacer
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-s1" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <FileText className="h-7 w-7 text-red" />
          <p className="text-sm text-t2">Impossible de charger ce thème.</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <FileText className="h-7 w-7 text-t3" />
          <p className="text-sm text-t2">Aucun texte dans ce thème pour l'instant.</p>
          <p className="text-xs text-t3">Les éditeurs n'ont pas encore rattaché de document à ce thème.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="px-1 text-[11px] text-t3">
            {documents.length} texte{documents.length > 1 ? 's' : ''}
          </p>
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onOpen={onOpenDocument} />
          ))}
        </div>
      )}
    </div>
  );
}

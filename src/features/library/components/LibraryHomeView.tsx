/**
 * LibraryHomeView.tsx — Accueil vivant de la Bibliothèque (état « avant recherche »).
 *
 * Remplace l'ancien état vide statique : dès l'arrivée sur la page, le fonds
 * documentaire est visible et exploitable sans taper une seule lettre :
 *  - statistiques du fonds (textes, articles, institutions) ;
 *  - reprise des recherches récentes (localStorage) ;
 *  - textes fondamentaux (constitution, codes) ouvrables en un clic ;
 *  - derniers textes publiés ;
 *  - suggestions de recherche cliquables.
 */

import {
  BookMarked,
  Clock3,
  FileText,
  Landmark,
  Scale,
  ScrollText,
  Search,
  X,
} from 'lucide-react';
import { useLibraryHome } from '@/features/library/hooks/useLibrary';
import {
  SCOPE_LABELS,
  type LibraryHomeDocument,
} from '@/features/library/types';

interface LibraryHomeViewProps {
  /** Lance une recherche (suggestion ou recherche récente cliquée). */
  onSearch: (query: string) => void;
  /** Ouvre un document dans le panneau de lecture. */
  onOpenDocument: (doc: LibraryHomeDocument) => void;
  recentSearches: string[];
  onClearRecentSearches: () => void;
}

/** Compteur compact (14 532 → « 14,5 k »). */
function compact(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-1.5 px-1 font-mono text-[10px] uppercase tracking-widest text-t4">
      <Icon className="h-3 w-3" />
      {children}
    </h3>
  );
}

/** Carte cliquable d'un document (fondamental ou récent). */
function DocumentCard({
  doc,
  onOpen,
}: {
  doc: LibraryHomeDocument;
  onOpen: (doc: LibraryHomeDocument) => void;
}) {
  const scope = doc.legal_scope && doc.legal_scope !== 'all' ? doc.legal_scope : null;
  const date = formatDate(doc.date_publication);

  return (
    <button
      type="button"
      onClick={() => onOpen(doc)}
      className="group flex w-full items-start gap-2.5 rounded-xl border border-b1 bg-s1 p-3 text-left transition-colors hover:border-gold/30 hover:bg-s2"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-gold/10">
        <ScrollText className="h-3.5 w-3.5 text-gold" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-t1 group-hover:text-gold">
          {doc.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-t3">
          {doc.type_name && <span>{doc.type_name}</span>}
          {scope && (
            <span className="rounded bg-gold/10 px-1 py-px font-mono text-[9px] uppercase text-gold">
              {SCOPE_LABELS[scope]}
            </span>
          )}
          {date && <span>· {date}</span>}
          {(doc.articles_count ?? 0) > 0 && (
            <span>· {doc.articles_count} art.</span>
          )}
        </p>
      </div>
    </button>
  );
}

export default function LibraryHomeView({
  onSearch,
  onOpenDocument,
  recentSearches,
  onClearRecentSearches,
}: LibraryHomeViewProps) {
  const { data, isLoading } = useLibraryHome();

  return (
    <div className="space-y-6 pb-4">
      {/* En-tête : identité + fonds documentaire chiffré */}
      <div className="rounded-2xl border border-gold/15 bg-gold/[0.05] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10">
            <Scale className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-t1">
              Droit congolais & OHADA
            </h2>
            <p className="text-xs text-t3">
              Recherchez par notion, numéro d'article ou question.
            </p>
          </div>
        </div>

        {/* Stats du fonds — la bibliothèque montre qu'elle « vit » */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(
            [
              { icon: ScrollText, label: 'Textes', value: data?.stats.documents },
              { icon: FileText, label: 'Articles', value: data?.stats.articles },
              { icon: Landmark, label: 'Institutions', value: data?.stats.institutions },
            ] as const
          ).map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-lg border border-b1 bg-s1/60 px-2.5 py-2"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-gold" />
              <div className="min-w-0">
                {isLoading ? (
                  <div className="h-4 w-10 animate-pulse rounded bg-s2" />
                ) : (
                  <p className="font-display text-sm font-semibold leading-none text-t1">
                    {compact(value ?? 0)}
                  </p>
                )}
                <p className="mt-0.5 text-[9px] uppercase tracking-wide text-t4">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reprendre une recherche récente */}
      {recentSearches.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionTitle icon={Clock3}>Recherches récentes</SectionTitle>
            <button
              type="button"
              onClick={onClearRecentSearches}
              className="flex items-center gap-1 px-1 text-[10px] text-t4 transition-colors hover:text-t2"
            >
              <X className="h-3 w-3" />
              Effacer
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onSearch(q)}
                className="flex max-w-full items-center gap-1.5 rounded-full border border-b1 bg-s1 px-2.5 py-1 text-[11px] text-t2 transition-colors hover:border-gold/30 hover:text-t1"
              >
                <Clock3 className="h-3 w-3 shrink-0 text-t4" />
                <span className="truncate">{q}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Textes fondamentaux */}
      <section className="space-y-2">
        <SectionTitle icon={BookMarked}>Textes fondamentaux</SectionTitle>
        {isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-s1" />
            ))}
          </div>
        ) : data && data.essential_documents.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {data.essential_documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onOpen={onOpenDocument} />
            ))}
          </div>
        ) : (
          <p className="px-1 text-xs text-t3">
            Les textes fondamentaux apparaîtront ici dès leur publication.
          </p>
        )}
      </section>

      {/* Derniers textes publiés */}
      {data && data.recent_documents.length > 0 && (
        <section className="space-y-2">
          <SectionTitle icon={ScrollText}>Ajoutés récemment</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.recent_documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onOpen={onOpenDocument} />
            ))}
          </div>
        </section>
      )}

      {/* Suggestions de recherche */}
      <section className="space-y-2">
        <SectionTitle icon={Search}>Essayez par exemple</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {(data?.suggestions ?? []).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onSearch(ex)}
              className="rounded-full border border-b1 bg-s1 px-2.5 py-1 text-[11px] text-t2 transition-colors hover:border-gold/30 hover:text-t1"
            >
              {ex}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

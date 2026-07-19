/**
 * Journals.tsx — Kiosque « Journal Officiel » de l'espace Pro.
 *
 * Parcours du fonds publié comme un kiosque : dernier numéro paru en vitrine,
 * navigation par année, grille de numéros. La lecture d'un texte se fait dans
 * le reader de la Bibliothèque (cohérence de l'expérience de lecture).
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '@/widgets/layout/AppLayout';
import { useJournalsList, useJournalYears } from '@/features/journals/hooks/useJournals';
import { getJournalPdfUrl, type OfficialJournal } from '@/features/journals/api/journalsApi';
import {
  Newspaper, FileText, ChevronLeft, ChevronRight, ArrowRight, Download, Sparkles,
} from 'lucide-react';

/** Formate une date ISO en jj mois aaaa. */
function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Un numéro est « nouveau » s'il est paru il y a moins de 45 jours. */
function isRecent(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso).getTime();
  return !Number.isNaN(d) && Date.now() - d < 45 * 24 * 3600 * 1000;
}

function JournalCard({ journal }: { journal: OfficialJournal }) {
  return (
    <Link
      to={`/app/journals/${journal.id}`}
      className="group flex flex-col rounded-xl border border-b1 bg-s1 p-4 transition-all hover:border-gold/30 hover:bg-s2 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
          <Newspaper className="h-4.5 w-4.5" />
        </span>
        {isRecent(journal.publication_date) && (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold">
            <Sparkles className="h-2.5 w-2.5" /> Nouveau
          </span>
        )}
      </div>

      <p className="mt-3 font-display text-sm font-semibold leading-snug text-t1 line-clamp-2 group-hover:text-gold transition-colors">
        {journal.number ? `JO n° ${journal.number}` : journal.title}
      </p>
      <p className="mt-0.5 text-[11px] text-t3">{fmtDate(journal.publication_date)}</p>

      <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-t3">
        <FileText className="h-3 w-3" />
        {journal.legal_documents_count ?? 0} texte{(journal.legal_documents_count ?? 0) > 1 ? 's' : ''}
        <ArrowRight className="ml-auto h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 text-gold" />
      </p>
    </Link>
  );
}

export default function ProJournals() {
  const navigate = useNavigate();
  const [year, setYear] = React.useState<string>('');
  const [page, setPage] = React.useState(1);

  const { data: yearsData } = useJournalYears();
  const years = yearsData?.data ?? [];

  // Vitrine : dernier numéro paru (indépendant du filtre d'année).
  const { data: latestData } = useJournalsList({ per_page: 1 });
  const latest = latestData?.data?.[0];

  const { data, isLoading, isFetching } = useJournalsList({
    page,
    per_page: 24,
    year: year || undefined,
  });
  const journals = data?.data ?? [];
  const meta = data?.meta;

  return (
    <AppLayout space="app">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
          {/* En-tête */}
          <header className="mb-6">
            <h1 className="flex items-center gap-2.5 font-display text-2xl font-semibold text-t1">
              <Newspaper className="h-6 w-6 text-gold" />
              Journal Officiel
            </h1>
            <p className="mt-1 text-sm text-t3">
              Parcourez les numéros publiés et lisez directement les textes qu'ils contiennent.
            </p>
          </header>

          {/* Vitrine : dernier numéro paru */}
          {latest && (
            <div className="mb-8 overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 via-s1 to-s1">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center md:p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-gold/15 text-gold">
                  <Newspaper className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-gold">
                    Dernier numéro paru
                  </p>
                  <h2 className="mt-0.5 truncate font-display text-lg font-semibold text-t1">
                    {latest.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-t3">
                    {fmtDate(latest.publication_date)} · {latest.legal_documents_count ?? 0} texte{(latest.legal_documents_count ?? 0) > 1 ? 's' : ''} publié{(latest.legal_documents_count ?? 0) > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    onClick={() => navigate(`/app/journals/${latest.id}`)}
                    className="flex h-9 items-center gap-2 rounded-lg bg-gold px-4 text-xs font-semibold text-on-gold transition-opacity hover:opacity-90"
                  >
                    Parcourir ce numéro <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => window.open(getJournalPdfUrl(latest.id), '_blank')}
                    className="flex h-9 items-center gap-2 rounded-lg border border-b1 px-3 text-xs text-t2 transition-colors hover:bg-s2 hover:text-t1"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation par année */}
          <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => { setYear(''); setPage(1); }}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                year === ''
                  ? 'border-gold/40 bg-gold/15 text-gold'
                  : 'border-b1 bg-s1 text-t3 hover:border-b2 hover:text-t1'
              }`}
            >
              Tous
            </button>
            {years.map(({ year: y, total }) => (
              <button
                key={y}
                onClick={() => { setYear(String(y)); setPage(1); }}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 font-mono text-xs transition-colors ${
                  year === String(y)
                    ? 'border-gold/40 bg-gold/15 font-semibold text-gold'
                    : 'border-b1 bg-s1 text-t3 hover:border-b2 hover:text-t1'
                }`}
                title={`${total} numéro${total > 1 ? 's' : ''}`}
              >
                {y}
                <span className="ml-1.5 text-[9px] opacity-60">{total}</span>
              </button>
            ))}
          </div>

          {/* Grille des numéros */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-s2" />
              ))}
            </div>
          ) : journals.length === 0 ? (
            <div className="rounded-xl border border-b1 bg-s1 py-14 text-center">
              <Newspaper className="mx-auto mb-3 h-8 w-8 text-t4" />
              <p className="text-sm text-t3">Aucun journal publié {year ? `pour ${year}` : 'pour le moment'}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {journals.map((journal) => (
                <JournalCard key={journal.id} journal={journal} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-b1 text-t2 transition-colors hover:bg-s2 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-mono text-xs text-t3">
                {meta.current_page} / {meta.last_page}{isFetching ? ' …' : ''}
              </span>
              <button
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-b1 text-t2 transition-colors hover:bg-s2 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <p className="mt-8 text-center font-mono text-[10px] text-t4">
            Vous cherchez un texte précis ?{' '}
            <Link to="/app/library" className="text-gold hover:underline">
              Utilisez la recherche de la Bibliothèque
            </Link>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

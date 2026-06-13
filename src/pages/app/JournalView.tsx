/**
 * JournalView.tsx — Sommaire d'un numéro du Journal Officiel (espace Pro).
 *
 * Présente le numéro comme un sommaire de revue : liste des textes publiés
 * (lecture dans le reader de la Bibliothèque) et PDF original en vis-à-vis
 * sur grand écran.
 */
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@/shared/components/layout/AppLayout';
import { useJournal } from '@/features/journals/hooks/useJournals';
import { getJournalPdfUrl } from '@/features/journals/api/journalsApi';
import JournalPdfPreview from '@/features/journals/components/JournalPdfPreview';
import {
  ArrowLeft, Newspaper, FileText, Download, ArrowUpRight, BookOpenText, Loader2,
} from 'lucide-react';

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function JournalView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: journal, isLoading, error } = useJournal(id || '');

  if (isLoading) {
    return (
      <AppLayout space="app">
        <div className="flex h-full items-center justify-center gap-2 text-t3">
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
          <span className="text-sm">Chargement du journal…</span>
        </div>
      </AppLayout>
    );
  }

  if (error || !journal) {
    return (
      <AppLayout space="app">
        <div className="flex h-full flex-col items-center justify-center gap-3 text-t3">
          <Newspaper className="h-8 w-8 text-t4" />
          <p className="text-sm">Ce journal n'est pas (ou plus) disponible.</p>
          <button
            onClick={() => navigate('/app/journals')}
            className="flex items-center gap-2 rounded-lg border border-b1 px-3 py-1.5 text-xs text-t2 transition-colors hover:bg-s2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour au kiosque
          </button>
        </div>
      </AppLayout>
    );
  }

  const documents = journal.legal_documents ?? [];

  return (
    <AppLayout space="app">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
          {/* En-tête */}
          <header className="mb-6 flex flex-wrap items-start gap-3">
            <button
              onClick={() => navigate('/app/journals')}
              className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-b1 text-t2 transition-colors hover:bg-s2"
              title="Retour au kiosque"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
              <Newspaper className="h-5.5 w-5.5" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold leading-tight text-t1">
                {journal.title}
              </h1>
              <p className="mt-1 font-mono text-[11px] text-t3">
                {journal.number ? `n° ${journal.number} · ` : ''}
                {fmtDate(journal.publication_date)} · {documents.length} texte{documents.length > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => window.open(getJournalPdfUrl(journal.id), '_blank')}
              className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-b1 px-3 text-xs text-t2 transition-colors hover:bg-s2 hover:text-t1"
            >
              <Download className="h-3.5 w-3.5" /> PDF original
            </button>
          </header>

          {/* Sommaire + PDF */}
          <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
            {/* Sommaire */}
            <section className="rounded-xl border border-b1 bg-s1">
              <header className="flex items-center gap-2 border-b border-b1 px-4 py-3">
                <BookOpenText className="h-4 w-4 text-gold" />
                <h2 className="text-sm font-semibold text-t1">Sommaire du numéro</h2>
              </header>

              {documents.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs text-t3">
                  Les textes de ce numéro sont en cours d'intégration.
                </p>
              ) : (
                <ol className="divide-y divide-b1/60">
                  {documents.map((doc, i) => (
                    <li key={doc.id}>
                      <Link
                        to={`/app/library?doc=${doc.id}`}
                        className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-s2"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-s3 font-mono text-[10px] font-bold text-t3 group-hover:bg-gold/15 group-hover:text-gold transition-colors">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium leading-snug text-t1 group-hover:text-gold transition-colors">
                            {doc.titre_officiel}
                          </p>
                          <p className="mt-1 flex items-center gap-2 font-mono text-[10px] text-t3">
                            <span className="rounded bg-s3 px-1.5 py-0.5 uppercase">{doc.type_code || 'Texte'}</span>
                            {typeof doc.articles_count === 'number' && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-2.5 w-2.5" />
                                {doc.articles_count} article{doc.articles_count > 1 ? 's' : ''}
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="mt-1 flex shrink-0 items-center gap-1 text-[10px] font-medium text-t4 transition-colors group-hover:text-gold">
                          Lire <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* PDF original en vis-à-vis (grand écran) */}
            <div className="hidden min-h-[560px] lg:block">
              <JournalPdfPreview journalId={journal.id} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

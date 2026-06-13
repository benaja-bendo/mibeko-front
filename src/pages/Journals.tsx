/**
 * Journals.tsx — Administration des journaux officiels (espace éditeur).
 * Liste tous les JO (publiés ou non) avec statut d'extraction et compteurs,
 * point d'entrée vers le détail pour la gestion et le traitement manuel.
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '@/shared/components/layout/AppLayout';
import PageContainer from '@/shared/components/layout/PageContainer';
import { useJournalsList } from '@/features/journals/hooks/useJournals';
import type { JournalFilters } from '@/features/journals/api/journalsApi';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/Select';
import {
  Newspaper, Search, ChevronLeft, ChevronRight, CheckCircle2,
  EyeOff, Upload, FileText,
} from 'lucide-react';

const TRANSCRIPTION_BADGES: Record<string, { label: string; cls: string }> = {
  pending:     { label: 'En attente', cls: 'text-t2 bg-s2 border-b1' },
  in_progress: { label: 'En cours',   cls: 'text-amber bg-amber/10 border-amber/20' },
  completed:   { label: 'Extrait',    cls: 'text-green bg-green/10 border-green/20' },
  failed:      { label: 'Échoué',     cls: 'text-red bg-red/10 border-red/20' },
};

function TranscriptionBadge({ status }: { status?: string | null }) {
  const cfg = TRANSCRIPTION_BADGES[status || 'pending'] || TRANSCRIPTION_BADGES.pending;
  return (
    <span className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

const ALL = '__all__';

export default function Journals() {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [year, setYear] = React.useState('');
  const [status, setStatus] = React.useState(ALL);
  const [visibility, setVisibility] = React.useState(ALL);

  // Debounce simple de la recherche pour limiter les requêtes.
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters: JournalFilters = {
    page,
    per_page: 20,
    title: debouncedSearch || undefined,
    year: year || undefined,
    transcription_status: status === ALL ? undefined : status,
    is_published: visibility === ALL ? undefined : (visibility as 'true' | 'false'),
    managerView: true,
  };

  const { data, isLoading, isFetching } = useJournalsList(filters);
  const journals = data?.data ?? [];
  const meta = data?.meta;

  return (
    <AppLayout space="editor">
      <PageContainer className="flex flex-col gap-4 min-h-full">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
            <Newspaper className="w-5 h-5 text-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] sm:text-[20px] font-display font-semibold text-t1 leading-tight">
              Journaux officiels
            </h1>
            <p className="text-t3 text-[11px] font-mono">
              {meta?.total ?? '…'} journaux · administration et traitement des extractions
            </p>
          </div>
          <Button
            variant="gold"
            size="sm"
            onClick={() => navigate('/editor/ingestion')}
            className="gap-2"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ingérer un journal</span>
            <span className="sm:hidden">Ingérer</span>
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <Input
              placeholder="Rechercher un journal par titre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Input
            placeholder="Année"
            value={year}
            onChange={(e) => { setYear(e.target.value.replace(/\D/g, '').slice(0, 4)); setPage(1); }}
            className="w-[90px] h-9 font-mono text-center"
          />
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Extraction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Extraction : tout</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="completed">Extrait</SelectItem>
              <SelectItem value="failed">Échoué</SelectItem>
            </SelectContent>
          </Select>
          <Select value={visibility} onValueChange={(v) => { setVisibility(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Visibilité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Visibilité : tout</SelectItem>
              <SelectItem value="true">Publiés</SelectItem>
              <SelectItem value="false">Non publiés</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="flex-1 bg-s1 border border-b1 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0 min-w-[680px]">
              <thead>
                <tr className="text-left">
                  {['Journal', 'Date', 'Extraction', 'Textes', 'Visibilité'].map(h => (
                    <th key={h} className="sticky top-0 bg-s2 text-[10px] font-mono uppercase tracking-wider text-t3 font-semibold px-4 py-2.5 border-b border-b1">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-t3 font-mono text-[11px] uppercase tracking-widest">
                      Chargement…
                    </td>
                  </tr>
                )}
                {!isLoading && journals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-t3 text-[12px] italic">
                      Aucun journal officiel ne correspond à ces critères.
                    </td>
                  </tr>
                )}
                {journals.map(journal => (
                  <tr
                    key={journal.id}
                    onClick={() => navigate(`/editor/journals/${journal.id}`)}
                    className="cursor-pointer hover:bg-s2/60 transition-colors group"
                  >
                    <td className="px-4 py-3 border-b border-b1/60">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-t3 group-hover:text-gold shrink-0 transition-colors" />
                        <div className="min-w-0">
                          <p className="text-[13px] text-t1 truncate max-w-[340px] group-hover:text-gold transition-colors">
                            {journal.title}
                          </p>
                          {journal.number && (
                            <p className="text-[10px] text-t3 font-mono">n° {journal.number}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-b border-b1/60 text-[11px] text-t2 font-mono whitespace-nowrap">
                      {journal.publication_date?.slice(0, 10) || '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-b1/60">
                      <TranscriptionBadge status={journal.transcription_status} />
                    </td>
                    <td className="px-4 py-3 border-b border-b1/60 text-[11px] font-mono text-t2 whitespace-nowrap">
                      <span className="text-green">{journal.published_legal_documents_count ?? 0}</span>
                      <span className="text-t3"> / {journal.legal_documents_count ?? 0} publiés</span>
                    </td>
                    <td className="px-4 py-3 border-b border-b1/60">
                      {journal.is_published ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border text-green bg-green/10 border-green/20">
                          <CheckCircle2 className="w-3 h-3" /> Publié
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border text-t3 bg-s2 border-b1">
                          <EyeOff className="w-3 h-3" /> Masqué
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="h-12 border-t border-b1 flex items-center justify-between px-4 shrink-0">
              <span className="text-[10px] text-t3 font-mono">
                Page {meta.current_page} / {meta.last_page} · {meta.total} journaux
                {isFetching && ' · …'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="w-7 h-7 rounded border border-b1 text-t2 flex items-center justify-center hover:bg-s3 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={page >= (meta.last_page || 1)}
                  onClick={() => setPage(p => p + 1)}
                  className="w-7 h-7 rounded border border-b1 text-t2 flex items-center justify-center hover:bg-s3 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-[10px] text-t3 font-mono">
          Les journaux sont créés par l'<Link to="/editor/ingestion" className="text-gold hover:underline">ingestion FLUX</Link> ;
          cette page sert à les administrer et à corriger les manquements d'extraction.
        </p>
      </PageContainer>
    </AppLayout>
  );
}

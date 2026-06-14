import { Link } from 'react-router-dom';
import AppLayout from '@/shared/components/layout/AppLayout';
import { useAdminOverview } from '@/features/admin/hooks/useAdmin';
import { BookText, ChevronRight, AlertTriangle } from 'lucide-react';

function Metric({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <div className="bg-s1 border border-b1 rounded-xl px-4 py-3.5">
      <div className="text-t3 text-[11px] font-mono uppercase tracking-wide">{label}</div>
      <div className="text-t1 font-display text-2xl font-semibold mt-1">
        {loading ? <span className="text-t4">—</span> : (value ?? 0).toLocaleString('fr-FR')}
      </div>
    </div>
  );
}

function AttentionMetric({
  label,
  value,
  loading,
  to,
}: {
  label: string;
  value?: number;
  loading: boolean;
  to?: string;
}) {
  const warn = !loading && (value ?? 0) > 0;
  const className = [
    'block border rounded-xl px-4 py-3.5 transition-colors',
    warn ? 'bg-red-500/5 border-red-500/20' : 'bg-s1 border-b1',
    to ? 'hover:bg-s2' : '',
  ].join(' ');

  const content = (
    <>
      <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-t3">
        {warn && <AlertTriangle className="w-3 h-3 text-red-400" />}
        {label}
      </div>
      <div className={`font-display text-2xl font-semibold mt-1 ${warn ? 'text-red-400' : 'text-t1'}`}>
        {loading ? <span className="text-t4">—</span> : (value ?? 0).toLocaleString('fr-FR')}
      </div>
    </>
  );

  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useAdminOverview();

  return (
    <AppLayout space="admin">
      <div className="flex flex-col h-full">
        <header className="px-6 py-5 border-b border-b1">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-red-400 fill-none stroke-[1.5]">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h1 className="text-t1 font-display text-xl font-semibold">Administration</h1>
              <p className="text-t3 text-xs font-mono mt-0.5">Accès restreint — Administrateurs uniquement</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Fonds juridique */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Fonds juridique</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Metric label="Documents" value={data?.content.documents} loading={isLoading} />
              <Metric label="Articles" value={data?.content.articles} loading={isLoading} />
              <Metric label="Journaux officiels" value={data?.content.official_journals} loading={isLoading} />
            </div>
          </section>

          {/* Référentiels */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Référentiels</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Metric label="Types de loi" value={data?.referentiels.document_types} loading={isLoading} />
              <Metric label="Institutions" value={data?.referentiels.institutions} loading={isLoading} />
              <Metric label="Tags" value={data?.referentiels.tags} loading={isLoading} />
            </div>
            <Link
              to="/admin/referentiels"
              className="flex items-center justify-between bg-s1 border border-b1 rounded-xl px-4 py-3 hover:bg-s2 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                  <BookText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-t1 text-sm font-medium">Gérer les référentiels</div>
                  <div className="text-t3 text-xs">Types de loi, institutions, tags</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-t3 group-hover:text-t1 transition-colors" />
            </Link>
          </section>

          {/* Pilotage */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Pilotage</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Metric label="Utilisateurs" value={data?.people.users} loading={isLoading} />
              <AttentionMetric
                label="Signalements ouverts"
                value={data?.attention.open_flags}
                loading={isLoading}
                to="/admin/signalements"
              />
              <AttentionMetric label="Extractions en échec" value={data?.attention.failed_extractions} loading={isLoading} />
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

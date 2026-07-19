/**
 * Dashboard.tsx — Tableau de bord principal de Mibeko LegalTech.
 * Affiche les KPIs combinés des deux backends + activité récente.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getCatalog } from '@/features/documents/api/laravelApi';
import { getPythonGlobalStats, getPythonDocuments } from '@/features/ingestion/api/pythonApi';
import { usePythonStream } from '@/features/ingestion/hooks/usePythonStream';
import { useAuthStore } from "@/features/auth/store/authStore";
import AppLayout from '@/widgets/layout/AppLayout';
import PageContainer from '@/shared/components/layout/PageContainer';
import { formatCompactNumber } from '@/shared/lib/formatNumber';

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
interface KpiCardProps {
  label: string;
  value: number | string;
  sub?: string;
  color?: 'gold' | 'green' | 'blue' | 'red' | 'amber' | 'purple';
  icon: React.ReactNode;
}

function KpiCard({ label, value, sub, color = 'gold', icon }: KpiCardProps) {
  const colorMap = {
    gold:   { bg: 'bg-gold/8',   border: 'border-gold/12',   text: 'text-gold',   iconBg: 'bg-gold/10' },
    green:  { bg: 'bg-green/8',  border: 'border-green/12',  text: 'text-green',  iconBg: 'bg-green/10' },
    blue:   { bg: 'bg-blue/8',   border: 'border-blue/12',   text: 'text-blue',   iconBg: 'bg-blue/10' },
    red:    { bg: 'bg-red/8',    border: 'border-red/12',    text: 'text-red',    iconBg: 'bg-red/10' },
    amber:  { bg: 'bg-amber/8',  border: 'border-amber/12',  text: 'text-amber',  iconBg: 'bg-amber/10' },
    purple: { bg: 'bg-purple/8', border: 'border-purple/12', text: 'text-purple', iconBg: 'bg-purple/10' },
  }[color];

  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${colorMap.bg} ${colorMap.border} transition-all hover:scale-[1.01]`}>
      <div className={`rounded-lg p-2 ${colorMap.iconBg} shrink-0`}>
        <span className={colorMap.text}>{icon}</span>
      </div>
      <div className="min-w-0">
        <div className={`text-2xl font-display font-semibold ${colorMap.text}`}>
          {typeof value === 'number' ? formatCompactNumber(value) : value}
        </div>
        <div className="text-t2 text-xs font-body mt-0.5">{label}</div>
        {sub && <div className="text-t3 text-[11px] font-mono mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  completed:  { label: 'Complété',    color: 'text-green bg-green/10 border-green/20' },
  processing: { label: 'En cours',    color: 'text-amber bg-amber/10 border-amber/20' },
  pending:    { label: 'En attente',  color: 'text-t2   bg-s2       border-b1' },
  failed:     { label: 'Échoué',      color: 'text-red  bg-red/10   border-red/20' },
  partial:    { label: 'Partiel',     color: 'text-blue bg-blue/10  border-blue/20' },
  running:    { label: 'En cours',    color: 'text-amber bg-amber/10 border-amber/20' },
};

function StatusBadge({ status }: { status?: string | null }) {
  const cfg = STATUS_CONFIG[status || ''] || { label: status || '—', color: 'text-t3 bg-s2 border-b1' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Notification toast
// ---------------------------------------------------------------------------
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            'flex items-start gap-2.5 p-3 rounded-lg border text-sm font-body shadow-xl',
            t.type === 'success' ? 'bg-green/10 border-green/20 text-green' :
            t.type === 'error'   ? 'bg-red/10 border-red/20 text-red' :
                                    'bg-blue/10 border-blue/20 text-blue',
          ].join(' ')}
        >
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-50 hover:opacity-100 shrink-0">✕</button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
const IconDocs = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.5]">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const IconArticles = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.5]">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const IconRuns = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.5]">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconExtracted = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.5]">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

// ---------------------------------------------------------------------------
// Dashboard component
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const { user } = useAuthStore();
  const isAdminOrEditor = user?.roles?.includes('admin') || user?.roles?.includes('editor');

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = React.useRef(0);

  const addToast = (message: string, type: Toast['type']) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  // Listen to Python SSE
  usePythonStream({
    onNotification: ({ message, type }) => addToast(message, type),
  });

  // Fetch data
  const { data: pyStats } = useQuery({
    queryKey: ['python-stats'],
    queryFn: getPythonGlobalStats,
    refetchInterval: 10000,
  });

  const { data: laravelCatalog } = useQuery({
    queryKey: ['laravel-catalog'],
    queryFn: () => getCatalog({ per_page: 5 }),
  });

  const { data: pyDocs } = useQuery({
    queryKey: ['python-documents'],
    queryFn: () => getPythonDocuments({ limit: 6 }),
    refetchInterval: 10000,
  });

  const rawDocs = laravelCatalog?.data;
  const recentDocs = Array.isArray(rawDocs) ? rawDocs.slice(0, 5) : [];

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <PageContainer className="space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-display font-semibold text-t1">Tableau de bord</h1>
              <p className="text-t3 text-xs font-mono mt-0.5">Mibeko LegalTech — Vue d'ensemble</p>
            </div>
            <div className="flex items-center gap-2">
              {isAdminOrEditor && (
                <Link
                  to="/ingestion"
                  className="flex items-center gap-2 h-8 px-3 bg-gold text-on-gold rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Nouveau document
                </Link>
              )}
            </div>
          </div>

          {/* KPIs */}
          {isAdminOrEditor && pyStats && (
            <section>
              <div className="text-[11px] font-mono uppercase tracking-widest text-t3 mb-3">
                Traitement des documents
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard
                  label="Documents ingérés"
                  value={pyStats.total_documents}
                  sub={`${pyStats.documents_completed} complétés`}
                  color="gold"
                  icon={<IconDocs />}
                />
                <KpiCard
                  label="Articles extraits"
                  value={pyStats.total_articles}
                  color="green"
                  icon={<IconArticles />}
                />
                <KpiCard
                  label="Runs d'extraction"
                  value={pyStats.total_runs}
                  sub={pyStats.runs_running > 0 ? `${pyStats.runs_running} en cours` : undefined}
                  color={pyStats.runs_running > 0 ? 'amber' : 'blue'}
                  icon={<IconRuns />}
                />
                <KpiCard
                  label="Taux de succès"
                  value={pyStats.total_documents > 0
                    ? `${Math.round((pyStats.documents_completed / pyStats.total_documents) * 100)}%`
                    : '—'}
                  sub={`${pyStats.documents_failed} échoués`}
                  color="purple"
                  icon={<IconExtracted />}
                />
              </div>
            </section>
          )}

          <div className={`grid grid-cols-1 ${isAdminOrEditor ? 'lg:grid-cols-2' : ''} gap-5`}>
            {/* Documents récents */}
            <section className="bg-s1 border border-b1 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-b1">
                <div className="text-t1 text-sm font-semibold font-body">Documents récents</div>
                <Link to="/documents" className="text-[11px] text-gold hover:opacity-80 font-mono">
                  Voir tout →
                </Link>
              </div>
              <div className="divide-y divide-b1">
                {recentDocs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-t3 text-xs font-mono">
                    Aucun document dans le catalogue
                  </div>
                ) : recentDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    to={`/editor/viewer/${doc.id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-s2 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-md bg-gold/8 border border-gold/12 flex items-center justify-center shrink-0 mt-0.5">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-gold fill-none stroke-[1.5]">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-t1 text-xs font-body truncate group-hover:text-gold transition-colors">
                        {doc.titre_officiel}
                      </div>
                      <div className="text-t3 text-[11px] font-mono mt-0.5 flex items-center gap-2">
                        <span>{doc.type_code || doc.type?.code || 'DOC'}</span>
                        {doc.date_publication && <span>· {doc.date_publication}</span>}
                      </div>
                    </div>
                    <StatusBadge status={doc.statut} />
                  </Link>
                ))}
              </div>
            </section>

            {/* File d'ingestion */}
            {isAdminOrEditor && (
              <section className="bg-s1 border border-b1 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-b1">
                  <div className="text-t1 text-sm font-semibold font-body">File d'attente d'analyse</div>
                  <Link to="/ingestion" className="text-[11px] text-gold hover:opacity-80 font-mono">
                    Gérer →
                  </Link>
                </div>
                <div className="divide-y divide-b1">
                  {!pyDocs || pyDocs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-t3 text-xs font-mono">
                      Aucun document en traitement
                    </div>
                  ) : pyDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-s2 transition-colors"
                    >
                      <div className={[
                        'w-1.5 h-1.5 rounded-full mt-2 shrink-0',
                        doc.extraction_status === 'completed' ? 'bg-green' :
                        doc.extraction_status === 'processing' || doc.latest_run_status === 'running' ? 'bg-amber animate-pulse' :
                        doc.extraction_status === 'failed' ? 'bg-red' : 'bg-t3'
                      ].join(' ')} />
                      <div className="flex-1 min-w-0">
                        <div className="text-t1 text-xs font-body truncate">{doc.titre_officiel}</div>
                        <div className="text-t3 text-[11px] font-mono mt-0.5 flex items-center gap-2">
                          {doc.latest_run_source && <span>{doc.latest_run_source}</span>}
                          {doc.has_md && <span className="text-green">MD ✓</span>}
                          {doc.has_json && <span className="text-blue">JSON ✓</span>}
                        </div>
                      </div>
                      <StatusBadge status={doc.extraction_status} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Extraction status bar */}
          {isAdminOrEditor && pyStats && pyStats.total_documents > 0 && (
            <section className="bg-s1 border border-b1 rounded-xl p-4">
              <div className="text-t2 text-xs font-mono mb-3 uppercase tracking-widest">
                État d'extraction global
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-s3 gap-px">
                {pyStats.documents_completed > 0 && (
                  <div
                    className="bg-green transition-all"
                    style={{ width: `${(pyStats.documents_completed / pyStats.total_documents) * 100}%` }}
                  />
                )}
                {pyStats.documents_processing > 0 && (
                  <div
                    className="bg-amber animate-pulse"
                    style={{ width: `${(pyStats.documents_processing / pyStats.total_documents) * 100}%` }}
                  />
                )}
                {pyStats.documents_failed > 0 && (
                  <div
                    className="bg-red"
                    style={{ width: `${(pyStats.documents_failed / pyStats.total_documents) * 100}%` }}
                  />
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
                {[
                  { label: 'Complétés', value: pyStats.documents_completed, color: 'text-green' },
                  { label: 'En cours',  value: pyStats.documents_processing, color: 'text-amber' },
                  { label: 'En attente', value: pyStats.documents_pending, color: 'text-t3' },
                  { label: 'Échoués',   value: pyStats.documents_failed, color: 'text-red' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className={`text-xs font-mono font-semibold ${item.color}`}>{formatCompactNumber(item.value)}</span>
                    <span className="text-t3 text-[11px] font-mono">{item.label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </PageContainer>
      </div>

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </AppLayout>
  );
}

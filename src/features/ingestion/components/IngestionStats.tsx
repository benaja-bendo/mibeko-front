/**
 * IngestionStats.tsx — État de la file d'ingestion : KPIs par étape du sas
 * (à traiter / à valider / publiés) + santé du service Python.
 * Les cartes sont cliquables et pilotent l'onglet actif de la file.
 */
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPythonGlobalStats, getPythonHealth } from '../api/pythonApi';

export type QueueStage = 'review' | 'draft';

export function ServiceHealth() {
  const { data: health, isError } = useQuery({
    queryKey: ['python-health'],
    queryFn: getPythonHealth,
    refetchInterval: 30000,
    retry: false,
  });

  const ok = !isError && health?.status === 'ok' && health?.db === 'ok';
  const label = isError ? 'Service injoignable' : health?.db !== 'ok' ? 'Base de données KO' : 'Service opérationnel';

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-t3">
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green' : 'bg-red animate-pulse'}`} />
      {label}
    </span>
  );
}

function StageCard({
  label,
  sublabel,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  sublabel: string;
  value: number | string;
  tone: 'gold' | 'amber' | 'green' | 'red';
  active?: boolean;
  onClick?: () => void;
}) {
  const toneText = { gold: 'text-gold', amber: 'text-amber', green: 'text-green', red: 'text-red' }[tone];
  const activeCls = active ? 'border-gold/40 bg-gold/5 ring-4 ring-gold/5' : 'border-b1 bg-s1 hover:border-b3';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl px-4 py-3 min-w-0 border transition-all ${activeCls} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className={`text-xl font-display font-semibold tabular-nums ${toneText}`}>{value}</div>
      <div className="text-t2 text-xs font-body mt-0.5 truncate">{label}</div>
      <div className="text-t4 text-[10px] font-mono truncate">{sublabel}</div>
    </button>
  );
}

export function IngestionStats({
  activeStage,
  failedActive,
  onSelectStage,
  onSelectFailed,
}: {
  activeStage: QueueStage;
  failedActive?: boolean;
  onSelectStage: (stage: QueueStage) => void;
  onSelectFailed: () => void;
}) {
  const navigate = useNavigate();
  const { data: stats } = useQuery({
    queryKey: ['python-stats'],
    queryFn: getPythonGlobalStats,
    refetchInterval: 15000,
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StageCard
        label="À valider"
        sublabel="parsing terminé — contrôle requis"
        value={stats?.documents_review ?? '—'}
        tone="gold"
        active={activeStage === 'review'}
        onClick={() => onSelectStage('review')}
      />
      <StageCard
        label="À traiter"
        sublabel="déposés — extraction / parsing"
        value={stats?.documents_draft ?? '—'}
        tone="amber"
        active={activeStage === 'draft' && !failedActive}
        onClick={() => onSelectStage('draft')}
      />
      <StageCard
        label="Échecs d'extraction"
        sublabel="filtrer pour relancer / rejeter"
        value={stats?.documents_failed ?? '—'}
        tone="red"
        active={failedActive}
        onClick={onSelectFailed}
      />
      <StageCard
        label="Publiés au catalogue"
        sublabel="ouvrir /editor/documents →"
        value={stats?.documents_published ?? '—'}
        tone="green"
        onClick={() => navigate('/editor/documents')}
      />
    </div>
  );
}

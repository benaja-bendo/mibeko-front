/**
 * badges.tsx — Badges partagés de la feature ingestion :
 * statut d'extraction, rôle documentaire (STOCK/FLUX), périmètre juridique.
 */
import { documentRoleLabel, documentRoleHint } from '@/shared/lib/labels';

const EXTRACTION_STATUS_CFG: Record<string, { cls: string; label: string }> = {
  completed:  { cls: 'text-green bg-green/10 border-green/20',   label: 'Terminé' },
  processing: { cls: 'text-amber bg-amber/10 border-amber/20',   label: 'En traitement' },
  partial:    { cls: 'text-blue bg-blue/10 border-blue/20',      label: 'Partiel' },
  pending:    { cls: 'text-t2 bg-s2 border-b1',                  label: 'En attente' },
  failed:     { cls: 'text-red bg-red/10 border-red/20',         label: 'Échec' },
  running:    { cls: 'text-amber bg-amber/10 border-amber/20',   label: 'En cours' },
  queued:     { cls: 'text-purple bg-purple/10 border-purple/20', label: 'En file' },
  succeeded:  { cls: 'text-green bg-green/10 border-green/20',   label: 'Réussi' },
  needs_review: { cls: 'text-gold bg-gold-d border-gold/25',     label: 'À arbitrer' },
  discarded:  { cls: 'text-t3 bg-s2 border-b1',                  label: 'Rejeté' },
};

export function StatusBadge({ status }: { status?: string | null }) {
  const cfg = EXTRACTION_STATUS_CFG[status || ''] || { cls: 'text-t3 bg-s2 border-b1', label: status || '—' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function RoleBadge({ role }: { role?: string | null }) {
  if (!role) return null;
  const isStock = role === 'STOCK';
  return (
    <span
      className={[
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider border',
        isStock ? 'text-gold bg-gold-d border-gold/25' : 'text-purple bg-purple/10 border-purple/25',
      ].join(' ')}
      title={documentRoleHint(role)}
    >
      {documentRoleLabel(role, { short: true })}
    </span>
  );
}

const SCOPE_LABELS: Record<string, string> = {
  national: 'National',
  ohada: 'OHADA',
  communautaire: 'Communautaire',
};

export function ScopeBadge({ scope }: { scope?: string | null }) {
  if (!scope || scope === 'national') return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-blue bg-blue/10 border border-blue/25">
      {SCOPE_LABELS[scope] || scope}
    </span>
  );
}

/** Pastille d'état animée (liste de documents). */
export function StatusDot({ status, runStatus }: { status?: string | null; runStatus?: string | null }) {
  const cls =
    status === 'completed' ? 'bg-green' :
    status === 'processing' || runStatus === 'running' ? 'bg-amber animate-pulse' :
    status === 'failed' ? 'bg-red' :
    status === 'partial' ? 'bg-blue' : 'bg-t4';
  return <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cls}`} />;
}

export function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin stroke-current fill-none stroke-2 ${className}`}>
      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
      <path d="M12 3a9 9 0 0 1 9 9" />
    </svg>
  );
}

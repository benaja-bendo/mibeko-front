import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/widgets/layout/AppLayout';
import { useFlags, useFlagMutations } from '@/features/admin/hooks/useAdmin';
import type { CurationFlagRef, FlagStatus, FlagBulkAction, FlagSeverity } from '@/features/admin/api/adminApi';
import ConfirmDeleteDialog from '@/features/admin/components/ConfirmDeleteDialog';
import { Button } from '@/shared/components/ui/Button';
import { toast } from '@/shared/store/useToast';
import { Check, Minus, RotateCcw, Trash2, FileText, ExternalLink, Flag } from 'lucide-react';

const TABS: { key: FlagStatus; label: string }[] = [
  { key: 'open', label: 'Ouverts' },
  { key: 'resolved', label: 'Résolus' },
  { key: 'all', label: 'Tous' },
];

/** Reprend la convention de sévérité du panneau d'anomalies éditeur. */
const SEVERITY: Record<FlagSeverity, { label: string; cls: string }> = {
  blocking: { label: 'Bloquant', cls: 'text-red bg-red/10 border-red/20' },
  warning: { label: 'À vérifier', cls: 'text-amber bg-amber/10 border-amber/20' },
  info: { label: 'Info', cls: 'text-blue bg-blue/10 border-blue/20' },
};

const SEVERITY_OPTIONS: { value: FlagSeverity; label: string }[] = [
  { value: 'blocking', label: 'Bloquant' },
  { value: 'warning', label: 'À vérifier' },
  { value: 'info', label: 'Info' },
];

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Case à cocher stylée cohérente avec le design (accent doré). */
function Checkbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={[
        'w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors',
        checked || indeterminate
          ? 'bg-gold border-gold text-on-gold'
          : 'border-b1 text-transparent hover:border-t3',
      ].join(' ')}
    >
      {indeterminate ? <Minus className="w-3 h-3" /> : <Check className="w-3 h-3" />}
    </button>
  );
}

export default function Signalements() {
  const [tab, setTab] = React.useState<FlagStatus>('open');
  const [page, setPage] = React.useState(1);
  const { data, isLoading, isError } = useFlags({ status: tab, page });
  const { resolve, setSeverity, remove, bulk } = useFlagMutations();
  const [toDelete, setToDelete] = React.useState<CurationFlagRef | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const flags = data?.data ?? [];
  const pagination = data?.pagination;

  // La sélection est propre à la page/onglet courant : on la vide dès qu'on
  // change de vue (les identifiants des autres pages ne sont plus visibles).
  React.useEffect(() => {
    setSelected(new Set());
  }, [tab, page]);

  const flagIds = flags.map((f) => f.id);
  const selectedCount = selected.size;
  const allSelected = flags.length > 0 && flagIds.every((id) => selected.has(id));

  const switchTab = (t: FlagStatus) => {
    setTab(t);
    setPage(1);
  };

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => setSelected(() => (allSelected ? new Set() : new Set(flagIds)));

  const runBulk = (action: FlagBulkAction) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    bulk.mutate(
      { ids, action },
      {
        onSuccess: (res) => {
          toast.success(res.message || 'Action effectuée');
          setSelected(new Set());
          setBulkDeleteOpen(false);
        },
        onError: (e) => toast.fromError(e),
      },
    );
  };

  return (
    <AppLayout space="admin">
      <div className="flex flex-col h-full">
        <header className="px-6 py-5 border-b border-b1">
          <h1 className="text-t1 font-display text-xl font-semibold">Signalements</h1>
          <p className="text-t3 text-xs font-mono mt-0.5">
            Erreurs et problèmes remontés par les utilisateurs sur le fonds juridique
          </p>
          <div className="flex gap-1 mt-4">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                className={[
                  'text-[12px] rounded-md px-3 py-1.5 transition-colors border',
                  tab === t.key
                    ? 'bg-gold/10 text-gold border-gold/20'
                    : 'text-t3 hover:text-t2 border-transparent hover:bg-s2',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl space-y-3">
            {/* Barre d'outils : sélection globale + compteur / actions groupées */}
            {!isLoading && !isError && flags.length > 0 ? (
              <div className="flex items-center gap-3 min-h-8">
                <Checkbox
                  checked={allSelected}
                  indeterminate={selectedCount > 0 && !allSelected}
                  onChange={toggleAll}
                  ariaLabel={allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                />
                {selectedCount > 0 ? (
                  <>
                    <span className="text-t2 text-xs font-mono">{selectedCount} sélectionné(s)</span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {tab !== 'resolved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={bulk.isPending}
                          onClick={() => runBulk('resolve')}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Résoudre
                        </Button>
                      )}
                      {tab !== 'open' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={bulk.isPending}
                          onClick={() => runBulk('reopen')}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Ré-ouvrir
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        className="gap-1.5"
                        disabled={bulk.isPending}
                        onClick={() => {
                          bulk.reset();
                          setBulkDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </Button>
                    </div>
                  </>
                ) : (
                  <span className="text-t3 text-xs font-mono">
                    {pagination?.total ?? flags.length} signalement(s)
                  </span>
                )}
              </div>
            ) : (
              <div className="text-t3 text-xs font-mono">
                {isLoading ? 'Chargement…' : `${pagination?.total ?? flags.length} signalement(s)`}
              </div>
            )}

            {isError && (
              <div className="text-red text-sm font-mono py-8 text-center">
                Impossible de charger les signalements.
              </div>
            )}

            {!isLoading && !isError && flags.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Flag className="w-8 h-8 text-t4" />
                <p className="text-t3 text-sm">
                  {tab === 'open' ? 'Aucun signalement ouvert. Tout est traité 🎉' : 'Aucun signalement.'}
                </p>
              </div>
            )}

            {flags.map((flag) => (
              <FlagCard
                key={flag.id}
                flag={flag}
                selected={selected.has(flag.id)}
                onToggleSelect={() => toggleOne(flag.id)}
                onResolve={() => resolve.mutate({ id: flag.id, resolved: !flag.resolved })}
                resolving={resolve.isPending}
                onSeverityChange={(severity) =>
                  setSeverity.mutate(
                    { id: flag.id, resolved: flag.resolved, severity },
                    {
                      onSuccess: () => toast.success('Sévérité mise à jour'),
                      onError: (e) => toast.fromError(e),
                    },
                  )
                }
                severityPending={setSeverity.isPending && setSeverity.variables?.id === flag.id}
                onDelete={() => setToDelete(flag)}
              />
            ))}

            {pagination && pagination.last_page > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <span className="text-t3 text-xs font-mono">
                  {pagination.current_page} / {pagination.last_page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.last_page}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer ce signalement ?"
        description="Le signalement sera définitivement supprimé. Utile pour les doublons ou hors-sujet."
        pending={remove.isPending}
        error={remove.error as Error | null}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />

      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={(o) => !o && setBulkDeleteOpen(false)}
        title={`Supprimer ${selectedCount} signalement(s) ?`}
        description="Les signalements sélectionnés seront définitivement supprimés. Action irréversible."
        pending={bulk.isPending}
        error={bulk.error as Error | null}
        onConfirm={() => runBulk('delete')}
      />
    </AppLayout>
  );
}

function FlagCard({
  flag,
  selected,
  onToggleSelect,
  onResolve,
  resolving,
  onSeverityChange,
  severityPending,
  onDelete,
}: {
  flag: CurationFlagRef;
  selected: boolean;
  onToggleSelect: () => void;
  onResolve: () => void;
  resolving: boolean;
  onSeverityChange: (severity: FlagSeverity) => void;
  severityPending: boolean;
  onDelete: () => void;
}) {
  const { target } = flag;

  return (
    <div
      className={[
        'border rounded-xl p-4 transition-colors',
        selected ? 'bg-gold/[0.04] border-gold/40' : 'bg-s1 border-b1',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Checkbox
            checked={selected}
            onChange={onToggleSelect}
            ariaLabel={selected ? 'Désélectionner ce signalement' : 'Sélectionner ce signalement'}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-block text-[11px] font-mono uppercase tracking-wide text-gold bg-gold/10 border border-gold/20 rounded px-1.5 py-0.5">
              {flag.type_probleme}
            </span>
            {flag.source === 'report' && (
              <span className="inline-block text-[11px] font-mono text-t3 bg-s2 border border-b1 rounded px-1.5 py-0.5">
                signalement public
              </span>
            )}
            {flag.resolved && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5">
                <Check className="w-3 h-3" />
                Résolu
              </span>
            )}
            <select
              value={flag.severity}
              disabled={severityPending}
              onChange={(e) => onSeverityChange(e.target.value as FlagSeverity)}
              title="Requalifier la sévérité au triage"
              className={[
                'text-[11px] font-mono rounded px-1.5 py-0.5 border focus:outline-none focus:ring-1 focus:ring-gold/40',
                SEVERITY[flag.severity]?.cls ?? 'text-t3 bg-s2 border-b1',
              ].join(' ')}
            >
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cible */}
          <div className="flex items-center gap-1.5 mt-2 text-sm text-t2 min-w-0">
            <FileText className="w-3.5 h-3.5 text-t3 shrink-0" />
            {target.document_id ? (
              <Link
                to={`/editor/viewer/${target.document_id}`}
                className="text-t1 hover:text-gold transition-colors truncate inline-flex items-center gap-1"
                title="Ouvrir dans le viewer"
              >
                <span className="truncate">{target.document_title || 'Document'}</span>
                {target.kind === 'article' && target.article_number && (
                  <span className="text-t3 font-mono text-xs shrink-0">· art. {target.article_number}</span>
                )}
                <ExternalLink className="w-3 h-3 shrink-0 text-t3" />
              </Link>
            ) : (
              <span className="text-t4 italic">Cible introuvable (supprimée ?)</span>
            )}
          </div>

          {flag.description && (
            <p className="text-t3 text-sm mt-2 whitespace-pre-wrap break-words">{flag.description}</p>
          )}

          <div className="text-t4 text-[11px] font-mono mt-2">
            Signalé le {fmtDate(flag.created_at)}
            {flag.resolved && flag.resolved_at && (
              <> · Résolu{flag.resolved_by ? ` par ${flag.resolved_by}` : ''} le {fmtDate(flag.resolved_at)}</>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={resolving}
            onClick={onResolve}
          >
            {flag.resolved ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                Ré-ouvrir
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Résoudre
              </>
            )}
          </Button>
          <button
            onClick={onDelete}
            className="p-2 rounded-md text-t3 hover:text-red hover:bg-red/10 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

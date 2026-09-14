/**
 * Relations.tsx — Relecture des relations modification/abrogation candidates (dashboard#123).
 *
 * Un détecteur heuristique (backend) propose des relations candidates entre
 * un nouvel acte et un texte existant, jamais une certitude : cette page est
 * le seul chemin pour les confirmer ou les rejeter avant qu'elles ne comptent
 * comme un fait établi ailleurs dans le produit (assistant, lecteur public).
 */
import { useState } from 'react';
import AppLayout from '@/widgets/layout/AppLayout';
import { toast } from '@/shared/store/useToast';
import { formatCompactNumber } from '@/shared/lib/formatNumber';
import { useRelations, useRelationMutations } from '@/features/relations/hooks/useRelations';
import RelationsTable from '@/features/relations/components/RelationsTable';
import RejectRelationDialog from '@/features/relations/components/RejectRelationDialog';
import type { DocumentRelationItem, RelationStatus } from '@/features/relations/api/relationsApi';

const STATUS_TABS: { value: RelationStatus; label: string }[] = [
  { value: 'candidate', label: 'Candidates' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'rejected', label: 'Rejetées' },
];

export default function Relations() {
  const [status, setStatus] = useState<RelationStatus>('candidate');
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<DocumentRelationItem | null>(null);

  const { data, isLoading, isFetching } = useRelations({ status, page });
  const { validate, reject } = useRelationMutations();

  const items = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.last_page ?? 1;

  const handleValidate = (id: string) => {
    validate.mutate(id, {
      onSuccess: () => toast.success('Relation validée'),
      onError: (err) => toast.fromError(err),
    });
  };

  const handleConfirmReject = (commentaire: string) => {
    if (!rejectTarget) return;
    reject.mutate(
      { id: rejectTarget.id, commentaire: commentaire || undefined },
      {
        onSuccess: () => {
          toast.success('Relation rejetée');
          setRejectTarget(null);
        },
        onError: (err) => toast.fromError(err),
      },
    );
  };

  return (
    <AppLayout>
      <div className="h-full overflow-hidden flex flex-col bg-bg">
        <div className="flex-1 flex flex-col max-w-screen-2xl mx-auto w-full px-4 md:px-6 py-6 space-y-4 overflow-hidden min-h-0">
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.5]">
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold text-t1">Relations candidates</h1>
              <p className="text-t3 text-[11px] font-mono mt-0.5">
                {pagination?.total != null
                  ? `${formatCompactNumber(pagination.total)} relation${pagination.total > 1 ? 's' : ''}`
                  : '…'}
                {isFetching && !isLoading && <span className="ml-2 opacity-60 animate-pulse">↻</span>}
              </p>
            </div>
          </div>

          {/* ── Filtres ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 bg-s1 border border-b1 rounded-xl p-1 w-fit">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatus(tab.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                  status === tab.value ? 'bg-gold text-on-gold' : 'text-t3 hover:text-t1'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Table ──────────────────────────────────────────────────── */}
          <RelationsTable
            items={items}
            isLoading={isLoading}
            onValidate={handleValidate}
            onReject={setRejectTarget}
            validatingId={validate.isPending ? validate.variables : undefined}
          />

          {/* ── Pagination ─────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 shrink-0">
              <span className="text-t3 text-[10px] font-mono">
                Page <strong className="text-t1">{page}</strong> / <strong className="text-t1">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-7 px-3 text-[10px] font-mono text-t2 bg-s1 border border-b1 rounded-lg hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ← Préc.
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 px-3 text-[10px] font-mono text-t2 bg-s1 border border-b1 rounded-lg hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Suiv. →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <RejectRelationDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        description={
          rejectTarget
            ? `${rejectTarget.source_document?.titre_officiel ?? 'Cette relation'} — ${rejectTarget.relation_type}`
            : ''
        }
        onConfirm={handleConfirmReject}
        pending={reject.isPending}
        error={reject.error as Error | null}
      />
    </AppLayout>
  );
}

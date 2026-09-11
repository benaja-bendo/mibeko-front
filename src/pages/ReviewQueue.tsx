/**
 * ReviewQueue.tsx — File de revue priorisée et assignable (mibeko-front#33).
 *
 * Vue d'ensemble des documents en cours de curation : priorité (réserves
 * bloquantes), ancienneté, responsable, motif de blocage. Permet de prendre
 * en charge un document et de transmettre une demande de correction tracée.
 */
import { useState } from 'react';
import AppLayout from '@/widgets/layout/AppLayout';
import { useAuthStore } from '@/features/auth/store/authStore';
import { hasRole } from '@/shared/types/auth';
import { toast } from '@/shared/store/useToast';
import { formatCompactNumber } from '@/shared/lib/formatNumber';
import { useReviewQueue, useReviewQueueMutations } from '@/features/reviewQueue/hooks/useReviewQueue';
import ReviewQueueTable from '@/features/reviewQueue/components/ReviewQueueTable';
import CorrectionRequestDialog from '@/features/reviewQueue/components/CorrectionRequestDialog';
import type { ReviewQueueItem, ReviewQueueStatus, CorrectionRequestSeverity } from '@/features/reviewQueue/api/reviewQueueApi';

const STATUS_TABS: { value: ReviewQueueStatus; label: string }[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'review', label: 'À valider' },
  { value: 'validated', label: 'Validé' },
];

const ASSIGNED_TABS: { value: 'all' | 'me' | 'unassigned'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'me', label: 'Assigné à moi' },
  { value: 'unassigned', label: 'Non assigné' },
];

export default function ReviewQueue() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = hasRole(user, 'admin');

  const [status, setStatus] = useState<ReviewQueueStatus>('review');
  const [assignedTab, setAssignedTab] = useState<'all' | 'me' | 'unassigned'>('all');
  const [page, setPage] = useState(1);
  const [correctionTarget, setCorrectionTarget] = useState<ReviewQueueItem | null>(null);

  const { data, isLoading, isFetching } = useReviewQueue({
    curation_status: status,
    assigned_to: assignedTab === 'all' ? undefined : assignedTab,
    page,
  });
  const { claim, release, requestCorrection } = useReviewQueueMutations();

  const items = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.last_page ?? 1;

  const handleClaim = (id: string) => {
    claim.mutate(id, {
      onSuccess: () => toast.success('Document pris en charge'),
      onError: (err) => toast.fromError(err, 'Document déjà pris en charge par un autre éditeur'),
    });
  };

  const handleRelease = (id: string) => {
    release.mutate(id, {
      onSuccess: () => toast.success('Document relâché'),
      onError: (err) => toast.fromError(err),
    });
  };

  const handleConfirmCorrection = (description: string, severity: CorrectionRequestSeverity) => {
    if (!correctionTarget) return;
    requestCorrection.mutate(
      { id: correctionTarget.id, payload: { description, severity } },
      {
        onSuccess: () => {
          toast.success('Demande de correction transmise');
          setCorrectionTarget(null);
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
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold text-t1">File de revue</h1>
              <p className="text-t3 text-[11px] font-mono mt-0.5">
                {pagination?.total != null ? `${formatCompactNumber(pagination.total)} document${pagination.total > 1 ? 's' : ''}` : '…'}
                {isFetching && !isLoading && <span className="ml-2 opacity-60 animate-pulse">↻</span>}
              </p>
            </div>
          </div>

          {/* ── Filtres ────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-s1 border border-b1 rounded-xl p-1">
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
            <div className="flex items-center gap-1 bg-s1 border border-b1 rounded-xl p-1">
              {ASSIGNED_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setAssignedTab(tab.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    assignedTab === tab.value ? 'bg-gold text-on-gold' : 'text-t3 hover:text-t1'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Table ──────────────────────────────────────────────────── */}
          <ReviewQueueTable
            items={items}
            isLoading={isLoading}
            currentUserId={user?.id}
            isAdmin={isAdmin}
            onClaim={handleClaim}
            onRelease={handleRelease}
            onRequestCorrection={setCorrectionTarget}
            claimingId={claim.isPending ? claim.variables : undefined}
            releasingId={release.isPending ? release.variables : undefined}
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

      <CorrectionRequestDialog
        open={!!correctionTarget}
        onOpenChange={(open) => !open && setCorrectionTarget(null)}
        documentTitle={correctionTarget?.titre_officiel ?? ''}
        onConfirm={handleConfirmCorrection}
        pending={requestCorrection.isPending}
        error={requestCorrection.error as Error | null}
      />
    </AppLayout>
  );
}

/**
 * IngestionJobsQueue.tsx — Zone « En cours » (front#43) : liste des travaux
 * de la file `ingestion_jobs` (mibeko-python#23), interrogée à intervalle
 * régulier — pas de SSE, le worker qui les traite est un processus séparé de
 * l'API (`notify_clients` ne peut plus l'atteindre). L'échec est un état
 * visible dans la liste, jamais un toast qui disparaît.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getIngestionJobs, relancerIngestionJob, type IngestionJob } from '../api/pythonApi';
import { StatusBadge, Spinner } from './badges';
import {
  ingestionJobStepLabel,
  ingestionJobKindLabel,
  ingestionErrorClassLabel,
} from '@/shared/lib/labels';
import { toast } from '@/shared/store/useToast';

const POLL_INTERVAL_MS = 5000;

const SHA256_HEX = /^[0-9a-f]{64}$/;

function manifestLabel(manifestId: string): string {
  // "depots/<sha256>" ou "sgg-jo/<slug>" : le segment après le "/" est ce que
  // l'éditeur reconnaît. Un dépôt web s'identifie par empreinte SHA-256 pure
  // (§ 3.6 du plan « boîte de réception » — jamais par nom de fichier, pour
  // que deux dépôts concurrents du même contenu collisionnent bien) : illisible
  // telle quelle, on la tronque pour l'affichage seulement.
  const slug = manifestId.split('/').slice(1).join('/') || manifestId;
  return SHA256_HEX.test(slug) ? `${slug.slice(0, 12)}…` : slug;
}

function JobResultLinks({ job, onOpenDocument }: { job: IngestionJob; onOpenDocument: (id: string) => void }) {
  const ids = job.result?.structure?.document_ids;
  if (job.status !== 'done' || !ids?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {ids.map((id, i) => (
        <button
          key={id}
          type="button"
          onClick={() => onOpenDocument(id)}
          className="h-6 px-2 rounded text-[11px] font-mono text-gold bg-gold/8 border border-gold/20 hover:bg-gold/15 transition-colors"
        >
          Ouvrir {ids.length > 1 ? `l'acte ${i + 1}` : 'le document'}
        </button>
      ))}
    </div>
  );
}

function JobRow({ job, onOpenDocument }: { job: IngestionJob; onOpenDocument: (id: string) => void }) {
  const queryClient = useQueryClient();
  const relancer = useMutation({
    mutationFn: () => relancerIngestionJob(job.id),
    onSuccess: () => {
      toast.success('Travail relancé.');
      queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] });
    },
    onError: (err) => toast.fromError(err, 'Impossible de relancer ce travail'),
  });

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-b1 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-t1 text-sm font-mono truncate">{manifestLabel(job.manifest_id)}</span>
          <StatusBadge status={job.status} />
          <span className="text-t4 text-[11px] font-mono">{ingestionJobKindLabel(job.kind)}</span>
        </div>
        <div className="text-t3 text-[11px] font-mono mt-1 flex items-center gap-2 flex-wrap">
          <span>Étape : {ingestionJobStepLabel(job.step)}</span>
          {job.attempts > 0 && <span>· Tentative {job.attempts}/{job.max_attempts}</span>}
        </div>
        {job.status === 'failed' && job.last_error && (
          <div className="mt-1.5 text-red text-[11px] font-mono bg-red/8 border border-red/20 rounded px-2 py-1.5">
            {job.error_class && (
              <span className="text-red/70">{ingestionErrorClassLabel(job.error_class)} — </span>
            )}
            {job.last_error}
          </div>
        )}
        <JobResultLinks job={job} onOpenDocument={onOpenDocument} />
      </div>
      {job.status === 'failed' && (
        <button
          type="button"
          disabled={relancer.isPending}
          onClick={() => relancer.mutate()}
          className="h-7 px-3 rounded-md text-xs font-mono text-gold border border-gold/30 bg-gold/8 hover:bg-gold/15 transition-colors disabled:opacity-40 shrink-0"
        >
          {relancer.isPending ? <Spinner className="w-3.5 h-3.5" /> : 'Relancer'}
        </button>
      )}
    </div>
  );
}

export function IngestionJobsQueue({ onOpenDocument }: { onOpenDocument: (documentId: string) => void }) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'running' | 'failed' | 'done'>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['ingestion-jobs', statusFilter],
    queryFn: () => getIngestionJobs({ limit: 100, status: statusFilter === 'ALL' ? undefined : statusFilter }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const jobs = data?.jobs ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center rounded-xl border border-b1 overflow-hidden w-fit">
        {(['ALL', 'pending', 'running', 'failed', 'done'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={[
              'h-9 px-3 text-[11px] font-mono transition-colors whitespace-nowrap',
              statusFilter === s ? 'bg-gold/10 text-gold' : 'bg-s1 text-t3 hover:text-t2',
            ].join(' ')}
          >
            {s === 'ALL' ? 'Tous' : s}
          </button>
        ))}
      </div>

      <div className="border border-b1 rounded-xl overflow-hidden bg-s1">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-t3">
            <Spinner />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-10 text-t3 text-sm font-mono">Aucun travail dans la file.</div>
        ) : (
          jobs.map((job) => <JobRow key={job.id} job={job} onOpenDocument={onOpenDocument} />)
        )}
      </div>
    </div>
  );
}

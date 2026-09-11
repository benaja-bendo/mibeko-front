import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import type { ReviewQueueItem } from '../api/reviewQueueApi';

/** Nombre entier de jours écoulés depuis `iso` (0 si aujourd'hui). */
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function AgeCell({ item }: { item: ReviewQueueItem }) {
  const days = daysSince(item.curation_status_changed_at ?? item.updated_at);
  if (days === null) return <span className="text-t4">—</span>;
  if (days === 0) return <span className="text-t2 font-mono text-xs">Aujourd'hui</span>;
  return (
    <span className="text-t2 font-mono text-xs">
      {days} jour{days > 1 ? 's' : ''}
    </span>
  );
}

function BlockingReasonCell({ item }: { item: ReviewQueueItem }) {
  if (item.blocking_flags_count === 0 && item.warning_flags_count === 0) {
    return <span className="text-t4 text-xs font-mono">Aucune réserve</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {item.blocking_flags_count > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border text-red-400 bg-red-400/10 border-red-400/20">
          {item.blocking_flags_count} bloquant{item.blocking_flags_count > 1 ? 's' : ''}
        </span>
      )}
      {item.warning_flags_count > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border text-amber-400 bg-amber-400/10 border-amber-400/20">
          {item.warning_flags_count} avertissement{item.warning_flags_count > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

function PriorityCell({ item }: { item: ReviewQueueItem }) {
  if (item.blocking_flags_count > 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border text-red-400 bg-red-400/10 border-red-400/20">
        Urgent
      </span>
    );
  }
  if (item.warning_flags_count > 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border text-amber-400 bg-amber-400/10 border-amber-400/20">
        À surveiller
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border text-t3 bg-s2 border-b1">
      Normal
    </span>
  );
}

export default function ReviewQueueTable({
  items,
  isLoading,
  currentUserId,
  isAdmin,
  onClaim,
  onRelease,
  onRequestCorrection,
  claimingId,
  releasingId,
}: {
  items: ReviewQueueItem[];
  isLoading: boolean;
  currentUserId: string | undefined;
  isAdmin: boolean;
  onClaim: (id: string) => void;
  onRelease: (id: string) => void;
  onRequestCorrection: (item: ReviewQueueItem) => void;
  claimingId?: string;
  releasingId?: string;
}) {
  return (
    <div className="flex-1 overflow-auto rounded-xl border border-b1 bg-s1 min-h-0">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="bg-s2/60 sticky top-0 z-10 backdrop-blur-md">
          <tr>
            {['Priorité', 'Document', 'Ancienneté', 'Responsable', 'Motif de blocage', ''].map((label) => (
              <th
                key={label}
                className="text-left px-4 py-3 text-t3 font-mono text-[10px] uppercase tracking-widest font-semibold border-b border-b1 whitespace-nowrap"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-b1/40">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-4 py-4">
                    <div className="h-3 bg-s2 rounded animate-pulse" style={{ width: `${50 + Math.random() * 30}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-16 text-center">
                <span className="text-t3 font-mono text-xs uppercase tracking-widest">
                  Aucun document dans cette file
                </span>
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isMine = !!item.assigned_to && item.assigned_to === currentUserId;
              return (
                <tr key={item.id} className="hover:bg-s2/40 transition-colors">
                  <td className="px-4 py-3 align-middle">
                    <PriorityCell item={item} />
                  </td>
                  <td className="px-4 py-3 align-middle max-w-xs">
                    <Link
                      to={`/editor/viewer/${item.id}`}
                      className="text-t1 hover:text-gold transition-colors font-medium line-clamp-1"
                    >
                      {item.titre_officiel}
                    </Link>
                    {item.libelle_descriptif && (
                      <p className="text-t3 text-xs line-clamp-1 mt-0.5">{item.libelle_descriptif}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <AgeCell item={item} />
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {item.assignee ? (
                      <span className={`text-xs font-mono ${isMine ? 'text-gold' : 'text-t2'}`}>
                        {isMine ? 'Vous' : item.assignee.name}
                      </span>
                    ) : (
                      <span className="text-t4 text-xs font-mono">Non assigné</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <BlockingReasonCell item={item} />
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      {!item.assigned_to && (
                        <Button
                          size="sm"
                          variant="gold"
                          disabled={claimingId === item.id}
                          onClick={() => onClaim(item.id)}
                        >
                          {claimingId === item.id ? 'Prise en charge…' : 'Prendre en charge'}
                        </Button>
                      )}
                      {!!item.assigned_to && (isMine || isAdmin) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={releasingId === item.id}
                          onClick={() => onRelease(item.id)}
                          title={isMine ? undefined : 'Débloquer : relâcher un document pris en charge par un autre éditeur'}
                        >
                          {releasingId === item.id ? 'Relâche…' : isMine ? 'Relâcher' : 'Débloquer'}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => onRequestCorrection(item)}>
                        Demander une correction
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

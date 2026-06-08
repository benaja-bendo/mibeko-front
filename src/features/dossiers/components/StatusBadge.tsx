/**
 * StatusBadge.tsx — Pastille de statut d'un dossier.
 */

import { STATUS_META, type DossierStatus } from '@/features/dossiers/types';

export default function StatusBadge({ status }: { status: DossierStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-b1 bg-s2 px-2 py-0.5 text-[11px] font-medium">
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      <span className={meta.color}>{meta.label}</span>
    </span>
  );
}

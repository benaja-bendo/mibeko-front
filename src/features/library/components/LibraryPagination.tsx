/**
 * LibraryPagination.tsx — Contrôles de pagination réelle des résultats.
 *
 * Branché sur les métadonnées renvoyées par le backend (total/per_page/
 * current_page/last_page).
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SearchPagination } from '@/features/library/types';

interface LibraryPaginationProps {
  pagination: SearchPagination;
  onPageChange: (page: number) => void;
}

export default function LibraryPagination({
  pagination,
  onPageChange,
}: LibraryPaginationProps) {
  const { current_page, last_page, total, per_page } = pagination;

  if (last_page <= 1) return null;

  const from = (current_page - 1) * per_page + 1;
  const to = Math.min(current_page * per_page, total);

  return (
    <div className="flex items-center justify-between border-t border-b1 px-1 py-3">
      <p className="text-[11px] text-t3">
        <span className="text-t2">
          {from}–{to}
        </span>{' '}
        sur {total}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(current_page - 1)}
          disabled={current_page <= 1}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-b1 text-t2 transition-colors hover:bg-s2 hover:text-t1 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="px-2 font-mono text-[11px] text-t2">
          {current_page} / {last_page}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(current_page + 1)}
          disabled={current_page >= last_page}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-b1 text-t2 transition-colors hover:bg-s2 hover:text-t1 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

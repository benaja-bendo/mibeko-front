/**
 * DossierTable.tsx — Vue tableau dense des dossiers (triable).
 *
 * S'appuie sur @tanstack/react-table pour le tri ; conçue pour être lisible
 * même avec de nombreuses lignes.
 */

import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronsUpDown, ChevronUp, ChevronDown, BookOpen, Paperclip } from 'lucide-react';
import type { Dossier } from '@/features/dossiers/types';
import StatusBadge from './StatusBadge';

interface DossierTableProps {
  dossiers: Dossier[];
  onOpen: (id: string) => void;
}

const columnHelper = createColumnHelper<Dossier>();

/** Date relative courte (jj/mm). */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export default function DossierTable({ dossiers, onOpen }: DossierTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'updatedAt', desc: true },
  ]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        header: 'Dossier',
        cell: (info) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-t1">{info.getValue()}</p>
            {info.row.original.client && (
              <p className="truncate text-[11px] text-t3">
                {info.row.original.client}
                {info.row.original.adverse
                  ? ` c/ ${info.row.original.adverse}`
                  : ''}
              </p>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('reference', {
        header: 'Réf.',
        cell: (info) => (
          <span className="font-mono text-[11px] text-t2">
            {info.getValue() || '—'}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Statut',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: 'counts',
        header: 'Contenu',
        cell: (info) => (
          <div className="flex items-center gap-3 text-[11px] text-t3">
            <span className="flex items-center gap-1" title="Références juridiques">
              <BookOpen className="h-3 w-3" />
              {info.row.original.references.length}
            </span>
            <span className="flex items-center gap-1" title="Pièces">
              <Paperclip className="h-3 w-3" />
              {info.row.original.pieces.length}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('updatedAt', {
        header: 'Maj',
        cell: (info) => (
          <span className="font-mono text-[11px] text-t3">
            {shortDate(info.getValue())}
          </span>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: dossiers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-b1">
      <table className="w-full border-collapse text-sm min-w-[560px]">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-b1 bg-s1">
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                return (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={`px-3 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-t3 ${
                      canSort ? 'cursor-pointer select-none hover:text-t2' : ''
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {canSort &&
                        (sorted === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : sorted === 'desc' ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onOpen(row.original.id)}
              className="cursor-pointer border-b border-b1 bg-bg transition-colors last:border-0 hover:bg-s1"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2.5 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

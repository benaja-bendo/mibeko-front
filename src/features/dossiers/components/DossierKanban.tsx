/**
 * DossierKanban.tsx — Vue Kanban des dossiers par statut.
 *
 * Glisser-déposer natif (HTML5) pour déplacer un dossier d'une colonne à l'autre,
 * ce qui met à jour son statut.
 */

import { useState } from 'react';
import { BookOpen, Paperclip } from 'lucide-react';
import {
  STATUS_META,
  STATUS_ORDER,
  type Dossier,
  type DossierStatus,
} from '@/features/dossiers/types';

interface DossierKanbanProps {
  dossiers: Dossier[];
  onOpen: (id: string) => void;
  /** Déplacement d'un dossier dans une autre colonne (changement de statut). */
  onStatusChange: (id: string, status: DossierStatus) => void;
}

export default function DossierKanban({
  dossiers,
  onOpen,
  onStatusChange,
}: DossierKanbanProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<DossierStatus | null>(null);

  const drop = (status: DossierStatus) => {
    if (dragId) onStatusChange(dragId, status);
    setDragId(null);
    setOverColumn(null);
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {STATUS_ORDER.map((status) => {
        const items = dossiers.filter((d) => d.status === status);
        const meta = STATUS_META[status];
        const isOver = overColumn === status;

        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setOverColumn(status);
            }}
            onDragLeave={() => setOverColumn((c) => (c === status ? null : c))}
            onDrop={() => drop(status)}
            className={`flex flex-col rounded-xl border bg-s1/40 transition-colors ${
              isOver ? 'border-gold/40 bg-gold/[0.04]' : 'border-b1'
            }`}
          >
            {/* En-tête de colonne */}
            <div className="flex items-center justify-between border-b border-b1 px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs font-semibold">
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                <span className={meta.color}>{meta.label}</span>
              </span>
              <span className="rounded bg-s3 px-1.5 py-0.5 font-mono text-[10px] text-t3">
                {items.length}
              </span>
            </div>

            {/* Cartes */}
            <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
              {items.length === 0 && (
                <p className="px-2 py-6 text-center text-[11px] text-t4">
                  Déposez un dossier ici
                </p>
              )}
              {items.map((dossier) => (
                <button
                  key={dossier.id}
                  type="button"
                  draggable
                  onDragStart={() => setDragId(dossier.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => onOpen(dossier.id)}
                  className={`cursor-grab rounded-lg border border-b1 bg-s2 p-3 text-left transition-colors hover:border-gold/30 hover:bg-s3 active:cursor-grabbing ${
                    dragId === dossier.id ? 'opacity-40' : ''
                  }`}
                >
                  {dossier.reference && (
                    <span className="font-mono text-[10px] text-t3">
                      {dossier.reference}
                    </span>
                  )}
                  <p className="mt-0.5 line-clamp-2 text-xs font-medium text-t1">
                    {dossier.title}
                  </p>
                  {dossier.client && (
                    <p className="mt-1 truncate text-[11px] text-t3">
                      {dossier.client}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-t3">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {dossier.references.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      {dossier.pieces.length}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

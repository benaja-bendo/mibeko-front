/**
 * useDossierAnnexes.ts — Annexes locales d'un dossier (références, pièces, documents).
 *
 * Le cœur du dossier (champs « affaire » + échéances) vit côté serveur via
 * TanStack Query (cf. `hooks/useDossiers`). Ces trois collections ne sont pas
 * encore persistées par l'API : elles restent locales (localStorage), indexées
 * par identifiant de dossier, et sont fusionnées dans la vue `Dossier` par le
 * hook `useDossiers`.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  GeneratedDocument,
  LegalReference,
  Piece,
} from '@/features/dossiers/types';

export interface DossierAnnex {
  references: LegalReference[];
  pieces: Piece[];
  documents: GeneratedDocument[];
}

export const EMPTY_ANNEX: DossierAnnex = {
  references: [],
  pieces: [],
  documents: [],
};

interface DossierAnnexesState {
  byId: Record<string, DossierAnnex>;

  addReference: (
    dossierId: string,
    ref: Omit<LegalReference, 'note'> & { note?: string },
  ) => void;
  removeReference: (dossierId: string, refId: string) => void;

  addPiece: (dossierId: string, piece: Omit<Piece, 'id' | 'addedAt'>) => void;
  removePiece: (dossierId: string, pieceId: string) => void;

  addDocument: (
    dossierId: string,
    doc: Omit<GeneratedDocument, 'id' | 'createdAt'>,
  ) => void;
  removeDocument: (dossierId: string, docId: string) => void;

  /** Oublie les annexes d'un dossier supprimé. */
  clear: (dossierId: string) => void;
}

/** Génère un identifiant unique (fallback si crypto indisponible). */
function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

const now = () => new Date().toISOString();

/** Met à jour les annexes d'un dossier par fusion immuable. */
function patchAnnex(
  byId: Record<string, DossierAnnex>,
  dossierId: string,
  updater: (annex: DossierAnnex) => DossierAnnex,
): Record<string, DossierAnnex> {
  const current = byId[dossierId] ?? EMPTY_ANNEX;
  return { ...byId, [dossierId]: updater(current) };
}

export const useDossierAnnexes = create<DossierAnnexesState>()(
  persist(
    (set) => ({
      byId: {},

      addReference: (dossierId, ref) =>
        set((s) => ({
          byId: patchAnnex(s.byId, dossierId, (a) =>
            a.references.some((r) => r.id === ref.id)
              ? a
              : { ...a, references: [...a.references, { ...ref }] },
          ),
        })),

      removeReference: (dossierId, refId) =>
        set((s) => ({
          byId: patchAnnex(s.byId, dossierId, (a) => ({
            ...a,
            references: a.references.filter((r) => r.id !== refId),
          })),
        })),

      addPiece: (dossierId, piece) =>
        set((s) => ({
          byId: patchAnnex(s.byId, dossierId, (a) => ({
            ...a,
            pieces: [...a.pieces, { ...piece, id: uid(), addedAt: now() }],
          })),
        })),

      removePiece: (dossierId, pieceId) =>
        set((s) => ({
          byId: patchAnnex(s.byId, dossierId, (a) => ({
            ...a,
            pieces: a.pieces.filter((p) => p.id !== pieceId),
          })),
        })),

      addDocument: (dossierId, doc) =>
        set((s) => ({
          byId: patchAnnex(s.byId, dossierId, (a) => ({
            ...a,
            documents: [{ ...doc, id: uid(), createdAt: now() }, ...a.documents],
          })),
        })),

      removeDocument: (dossierId, docId) =>
        set((s) => ({
          byId: patchAnnex(s.byId, dossierId, (a) => ({
            ...a,
            documents: a.documents.filter((d) => d.id !== docId),
          })),
        })),

      clear: (dossierId) =>
        set((s) => {
          if (!(dossierId in s.byId)) return s;
          const next = { ...s.byId };
          delete next[dossierId];
          return { byId: next };
        }),
    }),
    {
      name: 'mibeko_dossier_annexes',
    },
  ),
);

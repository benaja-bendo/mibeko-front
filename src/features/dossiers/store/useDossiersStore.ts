/**
 * useDossiersStore.ts — État local des dossiers (Zustand + persistance).
 *
 * Source de vérité côté client tant que l'API CRUD n'existe pas. L'interface
 * publique (createDossier, updateDossier, …) imite un service afin de pouvoir
 * être remplacée par des appels réseau sans toucher aux composants.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Dossier,
  DossierInput,
  DossierStatus,
  GeneratedDocument,
  LegalReference,
  Piece,
} from '@/features/dossiers/types';

/** Génère un identifiant unique (fallback si crypto indisponible). */
function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

const now = () => new Date().toISOString();

interface DossiersState {
  dossiers: Dossier[];
  _seeded: boolean;

  createDossier: (input: DossierInput) => string;
  updateDossier: (id: string, patch: Partial<DossierInput>) => void;
  deleteDossier: (id: string) => void;
  setStatus: (id: string, status: DossierStatus) => void;

  addReference: (id: string, ref: Omit<LegalReference, 'note'> & { note?: string }) => void;
  removeReference: (id: string, refId: string) => void;

  addPiece: (id: string, piece: Omit<Piece, 'id' | 'addedAt'>) => void;
  removePiece: (id: string, pieceId: string) => void;

  addDocument: (id: string, doc: Omit<GeneratedDocument, 'id' | 'createdAt'>) => void;
  removeDocument: (id: string, docId: string) => void;

  /** Insère des dossiers d'exemple au premier lancement uniquement. */
  ensureSeeded: () => void;
}

/** Met à jour un dossier par fusion et rafraîchit `updatedAt`. */
function patchDossier(
  dossiers: Dossier[],
  id: string,
  updater: (d: Dossier) => Dossier,
): Dossier[] {
  return dossiers.map((d) =>
    d.id === id ? { ...updater(d), updatedAt: now() } : d,
  );
}

const SEED: Dossier[] = [
  {
    id: 'seed-1',
    title: 'Licenciement abusif — M. Kabongo',
    reference: '2026-0142',
    client: 'Société Minière du Katanga',
    adverse: 'M. Jean Kabongo',
    jurisdiction: 'Tribunal du travail de Lubumbashi',
    status: 'en_cours',
    description:
      'Contestation de la rupture du contrat de travail. Évaluation du respect de la procédure de licenciement et des indemnités dues.',
    references: [],
    pieces: [],
    documents: [],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'seed-2',
    title: 'Constitution SARL — TechCongo',
    reference: '2026-0150',
    client: 'TechCongo SARL (en formation)',
    adverse: '',
    jurisdiction: 'Guichet unique RCCM Kinshasa',
    status: 'ouvert',
    description:
      'Rédaction des statuts et accomplissement des formalités de constitution selon l\'Acte uniforme OHADA relatif aux sociétés commerciales.',
    references: [],
    pieces: [],
    documents: [],
    createdAt: now(),
    updatedAt: now(),
  },
];

export const useDossiersStore = create<DossiersState>()(
  persist(
    (set, get) => ({
      dossiers: [],
      _seeded: false,

      createDossier: (input) => {
        const id = uid();
        const dossier: Dossier = {
          id,
          title: input.title,
          reference: input.reference,
          client: input.client,
          adverse: input.adverse,
          jurisdiction: input.jurisdiction,
          description: input.description,
          status: 'ouvert',
          references: [],
          pieces: [],
          documents: [],
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ dossiers: [dossier, ...s.dossiers] }));
        return id;
      },

      updateDossier: (id, patch) =>
        set((s) => ({
          dossiers: patchDossier(s.dossiers, id, (d) => ({ ...d, ...patch })),
        })),

      deleteDossier: (id) =>
        set((s) => ({ dossiers: s.dossiers.filter((d) => d.id !== id) })),

      setStatus: (id, status) =>
        set((s) => ({
          dossiers: patchDossier(s.dossiers, id, (d) => ({ ...d, status })),
        })),

      addReference: (id, ref) =>
        set((s) => ({
          dossiers: patchDossier(s.dossiers, id, (d) =>
            d.references.some((r) => r.id === ref.id)
              ? d
              : { ...d, references: [...d.references, { ...ref }] },
          ),
        })),

      removeReference: (id, refId) =>
        set((s) => ({
          dossiers: patchDossier(s.dossiers, id, (d) => ({
            ...d,
            references: d.references.filter((r) => r.id !== refId),
          })),
        })),

      addPiece: (id, piece) =>
        set((s) => ({
          dossiers: patchDossier(s.dossiers, id, (d) => ({
            ...d,
            pieces: [
              ...d.pieces,
              { ...piece, id: uid(), addedAt: now() },
            ],
          })),
        })),

      removePiece: (id, pieceId) =>
        set((s) => ({
          dossiers: patchDossier(s.dossiers, id, (d) => ({
            ...d,
            pieces: d.pieces.filter((p) => p.id !== pieceId),
          })),
        })),

      addDocument: (id, doc) =>
        set((s) => ({
          dossiers: patchDossier(s.dossiers, id, (d) => ({
            ...d,
            documents: [
              { ...doc, id: uid(), createdAt: now() },
              ...d.documents,
            ],
          })),
        })),

      removeDocument: (id, docId) =>
        set((s) => ({
          dossiers: patchDossier(s.dossiers, id, (d) => ({
            ...d,
            documents: d.documents.filter((doc) => doc.id !== docId),
          })),
        })),

      ensureSeeded: () => {
        if (get()._seeded) return;
        set((s) => ({
          _seeded: true,
          dossiers: s.dossiers.length === 0 ? SEED : s.dossiers,
        }));
      },
    }),
    {
      name: 'mibeko_dossiers',
    },
  ),
);

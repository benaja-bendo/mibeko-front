/**
 * useDossierAnnexes.ts — Annexes d'un dossier (références, pièces, documents).
 *
 * Ces trois collections sont désormais persistées par l'API Laravel (au même
 * titre que le cœur « affaire » et les échéances). Elles sont renvoyées nichées
 * dans le dossier (`references[]`, `pieces[]`, `documents[]`) et chargées avec
 * lui par `useDossiers`. Ce hook expose la même surface qu'auparavant
 * (`addReference/removeReference/addPiece/removePiece/addDocument/removeDocument`)
 * mais adossée à des mutations serveur (TanStack Query) avec mise à jour
 * optimiste pour préserver la réactivité de l'ancien store local.
 *
 * Les identifiants persistés sont générés par le serveur : les composants ne
 * fabriquent plus d'uid client. Pour les références, l'`id` reste l'UUID de
 * l'article/document (clé de déduplication, cf. contrat `LegalReference.id`).
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addDocument,
  addPiece,
  addReference,
  removeDocument,
  removePiece,
  removeReference,
  type AddDocumentInput,
  type AddPieceInput,
  type AddReferenceInput,
} from '@/features/dossiers/api/dossiersApi';
import { dossierKeys } from '@/features/dossiers/hooks/useDossiers';
import type { Dossier } from '@/features/dossiers/types';

/** Applique une transformation aux annexes d'un dossier dans le cache liste. */
function patchDossierInCache(
  qc: ReturnType<typeof useQueryClient>,
  dossierId: string,
  updater: (dossier: Dossier) => Dossier,
) {
  qc.setQueryData<Dossier[]>(dossierKeys.list(), (prev) =>
    prev?.map((d) => (d.id === dossierId ? updater(d) : d)),
  );
}

/**
 * Surface stable consommée par les composants (DossierDrawer,
 * DocumentGeneratorModal, AddReferenceModal, Library). Chaque méthode déclenche
 * une mutation serveur ; le cache liste est mis à jour de façon optimiste puis
 * réconcilié à la réponse.
 */
export interface DossierAnnexesApi {
  addReference: (dossierId: string, ref: AddReferenceInput) => void;
  removeReference: (dossierId: string, refId: string) => void;
  addPiece: (dossierId: string, piece: AddPieceInput) => void;
  removePiece: (dossierId: string, pieceId: string) => void;
  addDocument: (dossierId: string, doc: AddDocumentInput) => void;
  removeDocument: (dossierId: string, docId: string) => void;
}

/**
 * Hook des mutations d'annexes. Remplace l'ancien store zustand local :
 * même API impérative, persistance serveur.
 */
export function useDossierAnnexes(): DossierAnnexesApi {
  const qc = useQueryClient();
  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: dossierKeys.list() }),
    [qc],
  );

  const addReferenceMut = useMutation({
    mutationFn: ({
      dossierId,
      input,
    }: {
      dossierId: string;
      input: AddReferenceInput;
    }) => addReference(dossierId, input),
    onSettled: invalidate,
  });

  const removeReferenceMut = useMutation({
    mutationFn: ({ dossierId, refId }: { dossierId: string; refId: string }) =>
      removeReference(dossierId, refId),
    onSettled: invalidate,
  });

  const addPieceMut = useMutation({
    mutationFn: ({
      dossierId,
      input,
    }: {
      dossierId: string;
      input: AddPieceInput;
    }) => addPiece(dossierId, input),
    onSettled: invalidate,
  });

  const removePieceMut = useMutation({
    mutationFn: ({ dossierId, pieceId }: { dossierId: string; pieceId: string }) =>
      removePiece(dossierId, pieceId),
    onSettled: invalidate,
  });

  const addDocumentMut = useMutation({
    mutationFn: ({
      dossierId,
      input,
    }: {
      dossierId: string;
      input: AddDocumentInput;
    }) => addDocument(dossierId, input),
    onSettled: invalidate,
  });

  const removeDocumentMut = useMutation({
    mutationFn: ({ dossierId, docId }: { dossierId: string; docId: string }) =>
      removeDocument(dossierId, docId),
    onSettled: invalidate,
  });

  return useMemo<DossierAnnexesApi>(
    () => ({
      addReference: (dossierId, input) => {
        // Idempotence : ne pas doubler une référence déjà rattachée (dédup par id
        // article/document, comme l'ancien localStorage).
        patchDossierInCache(qc, dossierId, (d) =>
          d.references.some((r) => r.id === input.id)
            ? d
            : { ...d, references: [...d.references, { ...input }] },
        );
        addReferenceMut.mutate({ dossierId, input });
      },

      removeReference: (dossierId, refId) => {
        patchDossierInCache(qc, dossierId, (d) => ({
          ...d,
          references: d.references.filter((r) => r.id !== refId),
        }));
        removeReferenceMut.mutate({ dossierId, refId });
      },

      addPiece: (dossierId, input) => {
        addPieceMut.mutate({ dossierId, input });
      },

      removePiece: (dossierId, pieceId) => {
        patchDossierInCache(qc, dossierId, (d) => ({
          ...d,
          pieces: d.pieces.filter((p) => p.id !== pieceId),
        }));
        removePieceMut.mutate({ dossierId, pieceId });
      },

      addDocument: (dossierId, input) => {
        addDocumentMut.mutate({ dossierId, input });
      },

      removeDocument: (dossierId, docId) => {
        patchDossierInCache(qc, dossierId, (d) => ({
          ...d,
          documents: d.documents.filter((doc) => doc.id !== docId),
        }));
        removeDocumentMut.mutate({ dossierId, docId });
      },
    }),
    [
      qc,
      addReferenceMut,
      removeReferenceMut,
      addPieceMut,
      removePieceMut,
      addDocumentMut,
      removeDocumentMut,
    ],
  );
}

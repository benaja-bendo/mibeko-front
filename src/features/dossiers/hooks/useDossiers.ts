/**
 * useDossiers.ts — Hooks TanStack Query du domaine Dossiers.
 *
 * Convention du repo : l'état serveur vit dans React Query. La liste serveur
 * (cœur + échéances) est fusionnée avec les annexes locales (références, pièces,
 * documents) pour produire la vue `Dossier` consommée par les composants.
 */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDossier,
  createEcheance,
  deleteDossier,
  deleteEcheance,
  listDossiers,
  updateDossier,
  updateEcheance,
} from '@/features/dossiers/api/dossiersApi';
import {
  EMPTY_ANNEX,
  useDossierAnnexes,
  type DossierAnnex,
} from '@/features/dossiers/store/useDossierAnnexes';
import type {
  CreateDossierInput,
  Dossier,
  DossierRecord,
  EcheanceInput,
  UpdateDossierInput,
} from '@/features/dossiers/types';

export const dossierKeys = {
  all: ['dossiers'] as const,
  list: () => [...dossierKeys.all, 'list'] as const,
};

/** Fusionne un enregistrement serveur avec ses annexes locales. */
function merge(record: DossierRecord, annex: DossierAnnex = EMPTY_ANNEX): Dossier {
  return {
    ...record,
    references: annex.references,
    pieces: annex.pieces,
    documents: annex.documents,
  };
}

/** Liste des dossiers (serveur + annexes), source de vérité de la page. */
export function useDossiers() {
  const query = useQuery({
    queryKey: dossierKeys.list(),
    queryFn: listDossiers,
    staleTime: 30_000,
  });
  const byId = useDossierAnnexes((s) => s.byId);

  const data = useMemo<Dossier[] | undefined>(
    () => query.data?.map((record) => merge(record, byId[record.id])),
    [query.data, byId],
  );

  return { ...query, data };
}

/** Dossier unique, dérivé de la liste (aucune requête supplémentaire). */
export function useDossier(id: string | null): Dossier | null {
  const { data } = useDossiers();
  return useMemo(
    () => (id ? (data?.find((d) => d.id === id) ?? null) : null),
    [data, id],
  );
}

export function useCreateDossier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDossierInput) => createDossier(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: dossierKeys.list() }),
  });
}

export function useUpdateDossier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateDossierInput }) =>
      updateDossier(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: dossierKeys.list() }),
  });
}

export function useDeleteDossier() {
  const qc = useQueryClient();
  const clearAnnex = useDossierAnnexes((s) => s.clear);
  return useMutation({
    mutationFn: (id: string) => deleteDossier(id),
    onSuccess: (_data, id) => {
      clearAnnex(id);
      qc.invalidateQueries({ queryKey: dossierKeys.list() });
    },
  });
}

export function useCreateEcheance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dossierId, input }: { dossierId: string; input: EcheanceInput }) =>
      createEcheance(dossierId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: dossierKeys.list() }),
  });
}

export function useUpdateEcheance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EcheanceInput }) =>
      updateEcheance(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: dossierKeys.list() }),
  });
}

export function useDeleteEcheance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEcheance(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: dossierKeys.list() }),
  });
}

/**
 * useDossiers.ts — Hooks TanStack Query du domaine Dossiers.
 *
 * Convention du repo : l'état serveur vit dans React Query. La liste serveur
 * renvoie chaque dossier complet — cœur « affaire », échéances ET annexes
 * (références, pièces, documents) nichées — produisant directement la vue
 * `Dossier` consommée par les composants. Aucune fusion locale : les annexes
 * sont persistées côté API (cf. `useDossierAnnexes`).
 */

import { useEffect, useMemo } from 'react';
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
import { migrateLocalAnnexes } from '@/features/dossiers/store/migrateLocalAnnexes';
import type {
  CreateDossierInput,
  Dossier,
  EcheanceInput,
  UpdateDossierInput,
} from '@/features/dossiers/types';

export const dossierKeys = {
  all: ['dossiers'] as const,
  list: () => [...dossierKeys.all, 'list'] as const,
};

/** Liste des dossiers complets (serveur), source de vérité de la page. */
export function useDossiers() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: dossierKeys.list(),
    queryFn: listDossiers,
    staleTime: 30_000,
  });

  // Migration douce, une seule fois : remonte vers l'API les annexes locales
  // résiduelles des dossiers possédés, puis purge le localStorage. La clé stable
  // (ids triés) évite de relancer l'effet à chaque rendu.
  const idsKey = query.data
    ? query.data.map((d) => d.id).sort().join(',')
    : '';
  useEffect(() => {
    if (!idsKey) return;
    void migrateLocalAnnexes(idsKey.split(','), () =>
      qc.invalidateQueries({ queryKey: dossierKeys.list() }),
    );
  }, [idsKey, qc]);

  return query;
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
  return useMutation({
    mutationFn: (id: string) => deleteDossier(id),
    // Les annexes sont supprimées côté serveur avec le dossier (cascade) : plus
    // rien à purger localement.
    onSuccess: () => qc.invalidateQueries({ queryKey: dossierKeys.list() }),
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

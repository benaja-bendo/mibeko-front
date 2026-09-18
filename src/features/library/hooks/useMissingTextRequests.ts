/**
 * useMissingTextRequests.ts — Hooks TanStack Query pour « Demander ce texte »
 * (mibeko-front#34).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyMissingTextRequests, requestMissingText } from '@/features/library/api/missingTextRequestsApi';

const missingTextRequestsKey = ['library', 'missing-text-requests'] as const;

/** Les demandes de texte manquant de l'utilisateur courant — retrouvables tant que non résolues. */
export function useMyMissingTextRequests(enabled: boolean) {
  return useQuery({
    queryKey: missingTextRequestsKey,
    queryFn: () => getMyMissingTextRequests(),
    enabled,
  });
}

export function useRequestMissingText() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: requestMissingText,
    onSuccess: () => client.invalidateQueries({ queryKey: missingTextRequestsKey }),
  });
}

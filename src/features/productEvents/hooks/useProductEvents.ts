/**
 * useProductEvents.ts — Émission fire-and-forget des jalons d'activation
 * (mibeko-dashboard#137). Un échec (422 référence invalide, réseau…) ne doit
 * jamais casser l'UI appelante — `mutate()` (pas `mutateAsync`) ne lève
 * jamais côté appelant ; l'erreur reste silencieuse pour l'utilisateur.
 */

import { useMutation } from '@tanstack/react-query';
import { generateClientId } from '@/shared/lib/clientId';
import { recordProductEvent } from '@/features/productEvents/api/productEventsApi';
import type { ProductEventType } from '@/features/productEvents/types';

export function useProductEvents() {
  const mutation = useMutation({
    mutationFn: recordProductEvent,
  });

  function recordSearchUseful(referenceId: string) {
    mutation.mutate({
      event_type: 'search_useful' satisfies ProductEventType,
      surface: 'web',
      reference_id: referenceId,
      client_event_id: generateClientId(),
    });
  }

  return { recordSearchUseful };
}

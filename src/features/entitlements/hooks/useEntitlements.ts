/**
 * useEntitlements.ts — Hook TanStack Query pour le droit d'usage (mibeko-dashboard#63).
 */

import { useQuery } from '@tanstack/react-query';
import { getEntitlements } from '@/features/entitlements/api/entitlementsApi';

export const entitlementsKeys = {
  all: ['entitlements'] as const,
};

export function useEntitlements() {
  return useQuery({
    queryKey: entitlementsKeys.all,
    queryFn: getEntitlements,
    staleTime: 30_000,
  });
}

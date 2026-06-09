/**
 * useBilling.ts — Hooks TanStack Query pour la facturation.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBillingOverview,
  openBillingPortal,
  startCheckout,
  updateBillingInfo,
} from '@/features/billing/api/billingApi';
import type { UpdateBillingInfoPayload } from '@/features/billing/types';

export const billingKeys = {
  all: ['billing'] as const,
  overview: () => [...billingKeys.all, 'overview'] as const,
};

/** Vue d'ensemble de la facturation. */
export function useBillingOverview() {
  return useQuery({
    queryKey: billingKeys.overview(),
    queryFn: getBillingOverview,
    staleTime: 60_000,
  });
}

/** Mise à jour des informations légales de facturation. */
export function useUpdateBillingInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBillingInfoPayload) => updateBillingInfo(payload),
    onSuccess: (overview) => qc.setQueryData(billingKeys.overview(), overview),
  });
}

/** Redirige vers Stripe Checkout pour souscrire à un plan. */
export function useStartCheckout() {
  return useMutation({
    mutationFn: (plan: string) => startCheckout(plan),
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}

/** Ouvre le portail de facturation Stripe. */
export function useOpenBillingPortal() {
  return useMutation({
    mutationFn: () => openBillingPortal(),
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}

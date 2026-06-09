/**
 * billingApi.ts — Client des endpoints « Facturation » (backend Laravel + Cashier).
 */

import { laravelClient, laravelBaseUrl } from '@/shared/api';
import type { BillingOverview, UpdateBillingInfoPayload } from '@/features/billing/types';

/** Vue d'ensemble : abonnement, moyen de paiement, factures, infos légales, plans. */
export async function getBillingOverview(): Promise<BillingOverview> {
  const { data } = await laravelClient.get('billing');
  return data.data;
}

/** Met à jour les informations légales de facturation. */
export async function updateBillingInfo(
  payload: UpdateBillingInfoPayload,
): Promise<BillingOverview> {
  const { data } = await laravelClient.put('billing/info', payload);
  return data.data;
}

/**
 * Démarre un abonnement via Stripe Checkout : renvoie l'URL de redirection.
 */
export async function startCheckout(plan: string): Promise<string> {
  const { data } = await laravelClient.post('billing/checkout', { plan });
  return data.data.url;
}

/**
 * Ouvre le portail de facturation Stripe (gestion CB, factures, annulation).
 */
export async function openBillingPortal(): Promise<string> {
  const { data } = await laravelClient.get('billing/portal');
  return data.data.url;
}

/** URL de téléchargement d'une facture PDF. */
export const invoicePdfUrl = (id: string): string =>
  `${laravelBaseUrl}/billing/invoices/${id}/pdf`;

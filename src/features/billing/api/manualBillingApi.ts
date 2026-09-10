import { laravelClient } from '@/shared/api/laravelClient';
import type { BillingPage, ManualGrant, CreditEntry, ManualPaymentOrder } from '../types';

export const getManualGrants = (page: number) => laravelClient
  .get<BillingPage<ManualGrant>>('billing/manual-grants', { params: { page } }).then((r) => r.data);

export const getCreditHistory = (page: number) => laravelClient
  .get<BillingPage<CreditEntry>>('billing/credits', { params: { page } }).then((r) => r.data);

export const getManualPaymentOrders = (page: number) => laravelClient
  .get<BillingPage<ManualPaymentOrder>>('billing/payment-orders', { params: { page } }).then((r) => r.data);

export const declareManualPayment = (orderId: string, paymentReference: string) => laravelClient
  .post<{ data: ManualPaymentOrder }>(`billing/payment-orders/${orderId}/declare`, {
    payment_reference: paymentReference,
  }).then((r) => r.data.data);

/**
 * Télécharge le justificatif (reçu de confirmation, pas une facture) d'un
 * abonnement Pro vendu à la main — mibeko-dashboard#121. Récupéré en blob
 * (pas un simple lien `<a href>`) : `laravelClient` authentifie par jeton
 * Bearer, qu'un lien nu ne porterait pas.
 */
export async function downloadManualGrantReceipt(grantId: string): Promise<void> {
  const res = await laravelClient.get(`billing/manual-grants/${grantId}/receipt`, {
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mibeko-recu-${grantId}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
}

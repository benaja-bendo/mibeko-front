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

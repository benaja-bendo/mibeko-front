import { laravelClient } from '@/shared/api/laravelClient';
import type { BillingPage, ManualGrant, CreditEntry } from '../types';

export const getManualGrants = (page: number) => laravelClient
  .get<BillingPage<ManualGrant>>('billing/manual-grants', { params: { page } }).then((r) => r.data);

export const getCreditHistory = (page: number) => laravelClient
  .get<BillingPage<CreditEntry>>('billing/credits', { params: { page } }).then((r) => r.data);

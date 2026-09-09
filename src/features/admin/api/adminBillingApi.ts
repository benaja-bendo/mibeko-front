import { laravelClient } from '@/shared/api/laravelClient';
import type { BillingPage, ManualGrant, CreditEntry } from '@/features/billing/types';

export interface BillingUser { id: string; name: string; email: string }
export interface AdminGrant extends ManualGrant { user: BillingUser | null; creator: { name: string } | null }
export interface AdminCredit extends CreditEntry { user?: BillingUser | null; author: { name: string } | null; reason: string | null; reference_id: string | null }
export interface BillingSummary { month: string; recorded_amount_fcfa: number; unpriced_grants: number; expiring_7_days: number; expiring_30_days: number; untracked_pro_accounts: number }
export interface UserCredits { balance: number; entries: { data: AdminCredit[]; last_page: number } }
export interface CreditInput { type: 'purchase' | 'correction'; amount: number; reason: string; reference_id: string }

export const getBillingSummary = (month: string) => laravelClient.get<{ data: BillingSummary }>('admin/billing/summary', { params: { month } }).then((r) => r.data.data);
export const getAdminGrants = (page: number, status: string) => laravelClient.get<BillingPage<AdminGrant>>('admin/billing/grants', { params: { page, status: status || undefined } }).then((r) => r.data);
export const getUntrackedAccounts = (page: number) => laravelClient.get<BillingPage<BillingUser>>('admin/billing/untracked', { params: { page } }).then((r) => r.data);
export const getAdminCredits = (page: number) => laravelClient.get<BillingPage<AdminCredit>>('admin/billing/credits', { params: { page } }).then((r) => r.data);
export const getUserCredits = (userId: string, page: number) => laravelClient.get<{ data: UserCredits }>(`admin/users/${userId}/credits`, { params: { page } }).then((r) => r.data.data);
export const storeUserCredits = (userId: string, input: CreditInput) => laravelClient.post(`admin/users/${userId}/credits`, input);

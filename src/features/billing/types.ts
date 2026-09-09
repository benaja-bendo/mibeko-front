/**
 * types.ts — Modèles du domaine « Facturation » (backend Cashier/Stripe).
 */

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'none';

export interface BillingPlan {
  /** Identifiant interne (ex: 'pro_monthly'). */
  id: string;
  name: string;
  /** Prix affiché formaté (ex: '15 000 FCFA / mois'). */
  price_label: string;
  features: string[];
  /** Price ID Stripe utilisé au checkout. */
  stripe_price?: string | null;
}

export interface CurrentSubscription {
  status: SubscriptionStatus;
  plan_name: string | null;
  /** Date de renouvellement / fin de période courante (ISO). */
  renews_at: string | null;
  trial_ends_at: string | null;
  /** Abonnement annulé mais actif jusqu'à la fin de période. */
  on_grace_period: boolean;
}

export interface PaymentMethod {
  brand: string;
  last_four: string;
}

export interface Invoice {
  id: string;
  number: string | null;
  /** Montant formaté (ex: '15 000 FCFA'). */
  total: string;
  status: string;
  date: string;
}

export interface BillingInfo {
  company: string | null;
  /** Registre du commerce et du crédit mobilier (RCCM) — registre OHADA, République du Congo. */
  rccm: string | null;
  /** Numéro d'identification fiscale (NIF / TVA). */
  tax_id: string | null;
  address: string | null;
}

/** Vue d'ensemble renvoyée par GET /billing. */
export interface BillingOverview {
  effective_plan: 'libre' | 'pro';
  manual_subscription: ManualGrant | null;
  credit_balance: number;
  subscription: CurrentSubscription;
  payment_method: PaymentMethod | null;
  invoices: Invoice[];
  billing_info: BillingInfo;
  plans: BillingPlan[];
  /** Indique si Stripe est configuré (sinon checkout/portail indisponibles). */
  stripe_enabled: boolean;
}

export interface ManualGrant {
  id: string;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'ended' | 'scheduled';
  amount_fcfa: number | null;
  channel: string | null;
  reference: string | null;
  created_at: string;
}

export interface CreditEntry {
  id: string;
  type: 'purchase' | 'correction' | 'consumption';
  amount: number;
  created_at: string;
}

export interface BillingPage<T> {
  data: T[];
  pagination: { current_page: number; last_page: number; total: number };
}

export interface UpdateBillingInfoPayload {
  company?: string | null;
  rccm?: string | null;
  tax_id?: string | null;
  address?: string | null;
}

/**
 * Charge utile de `GET /me/entitlements` (mibeko-dashboard#63) — point unique
 * de vérité du droit d'usage. Ne jamais redéduire un plan ou un quota
 * localement : ce type est la seule forme que web et mobile consomment.
 */

export interface AssistantQuota {
  used: number;
  limit: number;
  resets_at: string | null;
}

export interface Entitlements {
  plan: 'libre' | 'pro';
  features: {
    assistant: boolean;
    library: boolean;
    export: boolean;
  };
  quotas: {
    assistant: AssistantQuota;
  };
  credits: number | null;
}

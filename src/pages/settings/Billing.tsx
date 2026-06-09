import { useState } from 'react';
import { Check, Download, ExternalLink, Info } from 'lucide-react';
import SettingsLayout from './SettingsLayout';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { SettingsCard, Feedback } from '@/features/settings';
import {
  useBillingOverview,
  useOpenBillingPortal,
  useStartCheckout,
  useUpdateBillingInfo,
} from '@/features/billing/hooks/useBilling';
import { invoicePdfUrl } from '@/features/billing/api/billingApi';
import type {
  BillingInfo,
  BillingOverview,
  SubscriptionStatus,
} from '@/features/billing/types';

/** Libellé + style du badge de statut d'abonnement. */
const STATUS_META: Record<SubscriptionStatus, { label: string; className: string }> = {
  active: { label: 'Actif', className: 'bg-green-d border-green/20 text-green' },
  trialing: { label: 'Essai', className: 'bg-blue-d border-blue/20 text-blue' },
  past_due: { label: 'Paiement en retard', className: 'bg-amber-d border-amber/20 text-amber' },
  canceled: { label: 'Annulé', className: 'bg-red-d border-red/20 text-red' },
  none: { label: 'Aucun abonnement', className: 'bg-s2 border-b1 text-t2' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Page « Facturation » : plan courant, moyen de paiement, historique de factures
 * et informations légales de facturation. Les paiements passent par Stripe
 * (Checkout / portail) ; si Stripe n'est pas configuré, les actions sont désactivées.
 */
export default function Billing() {
  const { data, isLoading, isError, error, refetch } = useBillingOverview();

  return (
    <SettingsLayout title="Facturation" description="Votre abonnement, vos moyens de paiement et vos factures.">
      {isLoading && <p className="text-sm text-t3">Chargement…</p>}

      {isError && (
        <div className="bg-s1 border border-red/20 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm text-red">{error.message}</p>
          <button type="button" onClick={() => refetch()} className="text-xs text-gold hover:underline">
            Réessayer
          </button>
        </div>
      )}

      {data && <BillingContent data={data} />}
    </SettingsLayout>
  );
}

function BillingContent({ data }: { data: BillingOverview }) {
  const checkout = useStartCheckout();
  const portal = useOpenBillingPortal();
  const status = STATUS_META[data.subscription.status];
  const hasSubscription = data.subscription.status !== 'none';

  return (
    <div className="space-y-6">
      {!data.stripe_enabled && (
        <div className="flex items-start gap-2.5 rounded-lg border border-blue/20 bg-blue-d px-4 py-3 text-xs text-t2">
          <Info className="w-4 h-4 text-blue shrink-0 mt-0.5" />
          <span>
            Le paiement en ligne n'est pas encore activé sur votre espace. Contactez-nous pour gérer votre
            abonnement : <a href="mailto:facturation@mibeko.fr" className="text-gold hover:underline">facturation@mibeko.fr</a>.
          </span>
        </div>
      )}

      {/* Abonnement courant */}
      <SettingsCard
        title="Abonnement"
        description="Votre formule actuelle et son statut."
        action={
          <span className={`px-2.5 py-1 rounded-md border text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        }
        footer={
          hasSubscription ? (
            <Button
              variant="outline"
              size="sm"
              disabled={!data.stripe_enabled || portal.isPending}
              onClick={() => portal.mutate()}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" /> Gérer l'abonnement
            </Button>
          ) : null
        }
      >
        {hasSubscription ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Detail label="Formule" value={data.subscription.plan_name ?? '—'} />
            <Detail
              label={data.subscription.on_grace_period ? "Actif jusqu'au" : 'Prochain renouvellement'}
              value={formatDate(data.subscription.renews_at)}
            />
            {data.subscription.trial_ends_at && (
              <Detail label="Fin d'essai" value={formatDate(data.subscription.trial_ends_at)} />
            )}
          </div>
        ) : (
          <p className="text-sm text-t2">
            Vous n'avez pas d'abonnement actif. Choisissez une formule ci-dessous pour débloquer toutes les fonctionnalités.
          </p>
        )}
        {portal.isError && <Feedback kind="error" message={portal.error.message} className="mt-3" />}
      </SettingsCard>

      {/* Choix de plan (si pas d'abonnement) */}
      {!hasSubscription && data.plans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.plans.map((plan) => (
            <div key={plan.id} className="bg-s1 border border-b1 rounded-xl p-5 flex flex-col">
              <div className="text-sm font-semibold text-t1">{plan.name}</div>
              <div className="text-xl font-display text-gold mt-1">{plan.price_label}</div>
              <ul className="mt-4 space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-t2">
                    <Check className="w-4 h-4 text-green shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                variant="gold"
                size="sm"
                className="mt-5"
                disabled={!data.stripe_enabled || checkout.isPending}
                onClick={() => checkout.mutate(plan.id)}
              >
                Choisir {plan.name}
              </Button>
            </div>
          ))}
          {checkout.isError && <Feedback kind="error" message={checkout.error.message} />}
        </div>
      )}

      {/* Moyen de paiement */}
      {data.payment_method && (
        <SettingsCard title="Moyen de paiement" description="Carte utilisée pour vos prélèvements.">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 rounded bg-s2 border border-b1 text-xs font-mono uppercase text-t2">
              {data.payment_method.brand}
            </span>
            <span className="text-sm text-t1">•••• {data.payment_method.last_four}</span>
          </div>
        </SettingsCard>
      )}

      {/* Historique des factures */}
      <SettingsCard title="Factures" description="Historique et téléchargement de vos factures.">
        {data.invoices.length === 0 ? (
          <p className="text-sm text-t3">Aucune facture pour le moment.</p>
        ) : (
          <ul className="divide-y divide-b1">
            {data.invoices.map((invoice) => (
              <li key={invoice.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-t1">{invoice.number ?? invoice.id}</div>
                  <p className="text-xs text-t3 mt-0.5">{formatDate(invoice.date)} · {invoice.status}</p>
                </div>
                <span className="text-sm text-t2 font-mono">{invoice.total}</span>
                <a
                  href={invoicePdfUrl(invoice.id)}
                  target="_blank"
                  rel="noreferrer"
                  title="Télécharger la facture"
                  className="p-2 text-t3 hover:text-gold transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>

      <BillingInfoCard info={data.billing_info} />
    </div>
  );
}

/** Détail clé/valeur compact. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-t3">{label}</div>
      <div className="text-sm text-t1 mt-1">{value}</div>
    </div>
  );
}

/** Formulaire des informations légales de facturation (raison sociale, RCCM, NIF, adresse). */
function BillingInfoCard({ info }: { info: BillingInfo }) {
  const update = useUpdateBillingInfo();
  const [form, setForm] = useState<BillingInfo>(info);
  const [done, setDone] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(info);

  function set<K extends keyof BillingInfo>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDone(false);
    update.mutate(form, { onSuccess: () => setDone(true) });
  }

  return (
    <form onSubmit={handleSubmit}>
      <SettingsCard
        title="Informations de facturation"
        description="Coordonnées légales reprises sur vos factures."
        footer={
          <>
            {done && !update.isPending && <Feedback kind="success" message="Informations enregistrées." />}
            {update.isError && <Feedback kind="error" message={update.error.message} />}
            <Button type="submit" variant="gold" size="sm" disabled={!dirty || update.isPending}>
              {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="bi-company">Raison sociale</Label>
            <Input id="bi-company" value={form.company ?? ''} onChange={(e) => set('company', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bi-rccm">RCCM</Label>
            <Input id="bi-rccm" value={form.rccm ?? ''} onChange={(e) => set('rccm', e.target.value)} placeholder="CD/KIN/RCCM/…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bi-tax">NIF / TVA</Label>
            <Input id="bi-tax" value={form.tax_id ?? ''} onChange={(e) => set('tax_id', e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="bi-address">Adresse</Label>
            <Input id="bi-address" value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </div>
        </div>
      </SettingsCard>
    </form>
  );
}

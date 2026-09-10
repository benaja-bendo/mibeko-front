import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { declareManualPayment, getManualGrants, getCreditHistory, getManualPaymentOrders } from '../api/manualBillingApi';
import type { BillingOverview } from '../types';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { channelLabel, creditLabel, grantLabel, paymentOrderLabel } from '../labels';

const date = (value: string) => new Date(value).toLocaleDateString('fr-FR');

export function HistoryPagination({ page, lastPage, onChange }: { page: number; lastPage: number; onChange: (page: number) => void }) {
  return <div className="flex items-center gap-3 pt-3">
    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Précédent</Button>
    <span className="text-xs text-t3">Page {page} / {lastPage}</span>
    <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => onChange(page + 1)}>Suivant</Button>
  </div>;
}

export function ManualBilling({ data }: { data: BillingOverview }) {
  const [page, setPage] = useState(1);
  const [creditPage, setCreditPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [paymentReferences, setPaymentReferences] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const grants = useQuery({ queryKey: ['billing', 'manual-grants', page], queryFn: () => getManualGrants(page), refetchInterval: 30_000 });
  const credits = useQuery({ queryKey: ['billing', 'credits', creditPage], queryFn: () => getCreditHistory(creditPage), refetchInterval: 30_000 });
  const orders = useQuery({ queryKey: ['billing', 'payment-orders', orderPage], queryFn: () => getManualPaymentOrders(orderPage), refetchInterval: 30_000 });
  const declare = useMutation({
    mutationFn: ({ orderId, reference }: { orderId: string; reference: string }) => declareManualPayment(orderId, reference),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
  const manual = data.manual_subscription;

  return <>
    <section className="rounded-xl border border-b1 bg-s1 p-5 space-y-3">
      <h2 className="text-t1 font-semibold">Votre accès Mibeko : {data.effective_plan === 'pro' ? 'Pro' : 'Libre'}</h2>
      {manual ? <>
        <p className="text-t2">Abonnement manuel confirmé du {date(manual.starts_at)} au {date(manual.ends_at)}.</p>
        <p className="text-sm text-t3">Il ne se renouvelle pas automatiquement. Contactez-nous avant l’échéance pour le prolonger.</p>
      </> : data.effective_plan === 'pro' && data.subscription.status === 'none' ?
        <p className="text-sm text-t2">Votre compte bénéficie d’un accès Pro. Cet accès n’est pas une preuve de paiement d’un abonnement.</p> : null}
      <Link to="/settings/support?category=billing" className="text-gold underline text-sm">{manual ? 'Renouveler ou poser une question sur mon paiement' : 'Demander un abonnement ou signaler un paiement'}</Link>
      <p className="text-xs text-t3">Pour un paiement manuel, notre équipe confirme le tarif, la durée et les instructions avant votre règlement. L’accès est activé après vérification de l’encaissement. Ne communiquez jamais votre code PIN ou un code de validation.</p>
    </section>

    <section className="rounded-xl border border-b1 bg-s1 p-5 space-y-3">
      <h2 className="text-t1 font-semibold">Demandes de paiement</h2>
      <p className="text-xs text-t3">Chaque commande confirme le tarif, la durée et le canal réellement disponible. Une déclaration ou une capture d’écran ne prouve pas l’encaissement : notre équipe vérifie le paiement avant l’activation.</p>
      {orders.isPending && <p role="status">Chargement des demandes…</p>}
      {orders.isError && <div role="alert">{orders.error.message} <Button variant="outline" onClick={() => orders.refetch()}>Réessayer les demandes</Button></div>}
      {orders.data && <>
        {orders.data.data.length === 0 && <p className="text-sm text-t3">Aucune demande confirmée. Contactez l’équipe pour convenir de l’offre et du canal de paiement.</p>}
        <ul className="space-y-3">{orders.data.data.map((order) => {
          const reference = paymentReferences[order.id] ?? '';
          return <li key={order.id} className="rounded-lg border border-b1 bg-s2 p-4 text-sm space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-t1">{order.offer_label} · {order.amount_fcfa.toLocaleString('fr-FR')} FCFA</p>
              <span className="rounded-full border border-b1 px-2 py-0.5 text-xs text-gold">{paymentOrderLabel[order.status]}</span>
            </div>
            <p className="text-t2">Durée : {order.duration_months} mois · {channelLabel(order.channel)}</p>
            <p className="text-t3 break-all">Commande : {order.reference}</p>
            {order.status === 'awaiting_payment' && <>
              <div className="rounded-md border border-gold/20 bg-gold/5 p-3 whitespace-pre-wrap text-t2">{order.payment_instructions}</div>
              <label className="block text-xs text-t2 space-y-1">
                Référence de transaction ou de reçu
                <Input value={reference} onChange={(event) => setPaymentReferences((current) => ({ ...current, [order.id]: event.target.value }))} placeholder="Ex. MM-20260910-001" />
              </label>
              <Button
                variant="gold"
                size="sm"
                disabled={(declare.isPending && declare.variables?.orderId === order.id) || reference.trim().length < 3}
                onClick={() => declare.mutate({ orderId: order.id, reference: reference.trim() })}
              >{declare.isPending && declare.variables?.orderId === order.id ? 'Déclaration…' : 'Déclarer le paiement'}</Button>
            </>}
            {order.status === 'payment_declared' && <p className="text-t2">Votre référence {order.payment_reference} a été reçue. La vérification n’a pas encore commencé.</p>}
            {order.status === 'verifying' && <p className="text-t2">L’équipe rapproche actuellement la référence {order.payment_reference} avec l’encaissement.</p>}
            {order.status === 'activated' && <p className="text-emerald-400">Paiement vérifié et accès activé.</p>}
            {order.status === 'rejected' && <p className="text-red">Demande refusée : {order.rejection_reason}</p>}
            {declare.isError && declare.variables?.orderId === order.id && <p role="alert" className="text-red">{declare.error.message}</p>}
          </li>;
        })}</ul>
        <HistoryPagination page={orderPage} lastPage={orders.data.pagination.last_page} onChange={setOrderPage} />
      </>}
    </section>

    <section className="rounded-xl border border-b1 bg-s1 p-5 space-y-3">
      <h2 className="text-t1 font-semibold">Historique des abonnements manuels</h2>
      <p className="text-xs text-t3">Confirmations d’enregistrement, distinctes des factures Stripe. Pour un justificatif de paiement, contactez le support.</p>
      {grants.isPending && <p role="status">Chargement des abonnements…</p>}
      {grants.isError && <div role="alert">{grants.error.message} <Button variant="outline" onClick={() => grants.refetch()}>Réessayer les abonnements</Button></div>}
      {grants.data && <>
        {grants.data.data.length === 0 && <p className="text-sm text-t3">Aucun abonnement manuel enregistré.</p>}
        <ul className="divide-y divide-b1">{grants.data.data.map((grant) => <li key={grant.id} className="py-3 text-sm space-y-1">
          <p className="text-t1">Pro · {grantLabel[grant.status]} · du {date(grant.starts_at)} au {date(grant.ends_at)}</p>
          <p className="text-t2">{grant.amount_fcfa === null ? 'Montant non renseigné' : `${grant.amount_fcfa.toLocaleString('fr-FR')} FCFA`} · {channelLabel(grant.channel)}</p>
          <p className="text-t3 break-all">Référence : {grant.reference ?? grant.id}</p>
        </li>)}</ul>
        <HistoryPagination page={page} lastPage={grants.data.pagination.last_page} onChange={setPage} />
      </>}
    </section>

    <section className="rounded-xl border border-b1 bg-s1 p-5 space-y-3">
      <h2 className="text-t1 font-semibold">Crédits : {data.credit_balance ?? 0}</h2>
      {credits.isPending && <p role="status">Chargement des mouvements…</p>}
      {credits.isError && <div role="alert">{credits.error.message} <Button variant="outline" onClick={() => credits.refetch()}>Réessayer les crédits</Button></div>}
      {credits.data && <>
        {credits.data.data.length === 0 && <p className="text-sm text-t3">Aucun mouvement de crédits.</p>}
        <ul className="divide-y divide-b1">{credits.data.data.map((entry) => <li key={entry.id} className="py-2 text-sm text-t2">{date(entry.created_at)} · {creditLabel[entry.type]} · {entry.amount > 0 ? '+' : ''}{entry.amount}</li>)}</ul>
        <HistoryPagination page={creditPage} lastPage={credits.data.pagination.last_page} onChange={setCreditPage} />
      </>}
    </section>
  </>;
}

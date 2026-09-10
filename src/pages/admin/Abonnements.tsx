import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AppLayout from '@/widgets/layout/AppLayout';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { activatePaymentOrder, getAdminPaymentOrders, getBillingSummary, getAdminGrants, getAdminCredits, getUntrackedAccounts, rejectPaymentOrder, startPaymentVerification } from '@/features/admin/api/adminBillingApi';
import { HistoryPagination } from '@/features/billing/components/ManualBilling';
import { channelLabel, creditLabel, grantLabel, paymentOrderLabel } from '@/features/billing/labels';
import type { ManualPaymentOrderStatus } from '@/features/billing/types';

type Tab = 'orders' | 'grants' | 'credits' | 'untracked';
const date = (value: string) => new Date(value).toLocaleDateString('fr-FR');

export default function Abonnements() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [tab, setTab] = useState<Tab>('orders');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [orderStatus, setOrderStatus] = useState<ManualPaymentOrderStatus | ''>('');
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const summary = useQuery({ queryKey: ['admin-billing', 'summary', month], queryFn: () => getBillingSummary(month), enabled: Boolean(month) });
  const grants = useQuery({ queryKey: ['admin-billing', 'grants', page, status], queryFn: () => getAdminGrants(page, status), enabled: tab === 'grants' });
  const credits = useQuery({ queryKey: ['admin-billing', 'credits', page], queryFn: () => getAdminCredits(page), enabled: tab === 'credits' });
  const untracked = useQuery({ queryKey: ['admin-billing', 'untracked', page], queryFn: () => getUntrackedAccounts(page), enabled: tab === 'untracked' });
  const orders = useQuery({ queryKey: ['admin-billing', 'payment-orders', page, orderStatus], queryFn: () => getAdminPaymentOrders(page, orderStatus), enabled: tab === 'orders', refetchInterval: 30_000 });
  const invalidateOrders = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-billing'] });
    void queryClient.invalidateQueries({ queryKey: ['billing'] });
    void queryClient.invalidateQueries({ queryKey: ['entitlements'] });
  };
  const verify = useMutation({ mutationFn: startPaymentVerification, onSuccess: invalidateOrders });
  const activate = useMutation({ mutationFn: activatePaymentOrder, onSuccess: invalidateOrders });
  const reject = useMutation({ mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) => rejectPaymentOrder(orderId, reason), onSuccess: invalidateOrders });
  const current = tab === 'orders' ? orders : tab === 'grants' ? grants : tab === 'credits' ? credits : untracked;
  const personLink = (id: string, name: string) => <Link className="text-gold underline" to={`/admin/utilisateurs?focus=${id}`}>{name}</Link>;

  return <AppLayout space="admin"><div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto w-full">
    <header className="space-y-2"><h1 className="text-2xl font-display text-t1">Abonnements et crédits</h1>
      <p className="text-sm text-t3">Suivez une commande depuis les instructions de paiement jusqu’à l’activation ou au refus motivé.</p>
      <Link to="/admin/utilisateurs" className="text-gold underline">Créer une demande depuis la fiche d’un client</Link>
    </header>
    <label className="block text-sm text-t2 max-w-xs">Mois d’enregistrement<Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
    {summary.isPending && month && <p role="status">Chargement des indicateurs…</p>}
    {summary.isError && <p role="alert">{summary.error.message} <Button onClick={() => summary.refetch()}>Réessayer les indicateurs</Button></p>}
    {summary.data && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
        ['Montants enregistrés ce mois', `${summary.data.recorded_amount_fcfa.toLocaleString('fr-FR')} FCFA`],
        ['Octrois expirant sous 7 jours', summary.data.expiring_7_days],
        ['Octrois expirant sous 30 jours', summary.data.expiring_30_days],
        ['Comptes Pro sans octroi actif', summary.data.untracked_pro_accounts],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-b1 bg-s1 p-4"><p className="text-xs text-t3">{label}</p><p className="text-xl text-t1 mt-2">{value}</p></div>)}</div>
      <p className="text-xs text-t3">Somme des montants d’abonnements saisis ce mois, pas un rapprochement bancaire ni une recette nette de remboursements. {summary.data.unpriced_grants} octroi(s) sans montant. Les crédits ne sont pas des FCFA.</p>
    </>}
    <div className="flex gap-2 flex-wrap" aria-label="Vues de facturation">{([['orders', 'Demandes de paiement'], ['grants', 'Abonnements'], ['credits', 'Grand livre de crédits'], ['untracked', 'Pro à vérifier']] as const).map(([value, label]) => <Button key={value} variant={tab === value ? 'gold' : 'outline'} aria-pressed={tab === value} onClick={() => { setTab(value); setPage(1); }}>{label}</Button>)}</div>
    {tab === 'orders' && <label className="block text-sm text-t2">Étape <select className="bg-s1 border border-b1 rounded p-2" value={orderStatus} onChange={(e) => { setOrderStatus(e.target.value as ManualPaymentOrderStatus | ''); setPage(1); }}>
      <option value="">Toutes les demandes</option><option value="awaiting_payment">Paiement attendu</option><option value="payment_declared">Paiement déclaré</option><option value="verifying">Vérification en cours</option><option value="activated">Activées</option><option value="rejected">Refusées</option>
    </select></label>}
    {tab === 'grants' && <label className="block text-sm text-t2">Échéances <select className="bg-s1 border border-b1 rounded p-2" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
      <option value="">Tous les octrois</option><option value="active">Actifs</option><option value="expiring_7">Expire sous 7 jours</option><option value="expiring_30">Expire sous 30 jours</option><option value="ended">Terminés</option><option value="revoked">Accès retiré</option>
    </select></label>}
    {tab === 'untracked' && <p className="text-sm text-t3">Ces comptes portent le rôle user_pro sans octroi manuel actif. Vérifiez leur situation (accès offert, ancien rôle ou Stripe) avant toute régularisation. Aucun rôle n’est retiré automatiquement.</p>}
    {current.isPending && <p role="status">Chargement…</p>}
    {current.isError && <p role="alert">{current.error.message} <Button onClick={() => current.refetch()}>Réessayer la liste</Button></p>}
    {current.data?.data.length === 0 && <p className="text-t3">Aucun résultat pour cette vue.</p>}
    <ul className="space-y-3">
      {tab === 'orders' && orders.data?.data.map((order) => {
        const reason = rejectionReasons[order.id] ?? '';
        const canReject = order.status !== 'activated' && order.status !== 'rejected';
        const error = verify.variables === order.id && verify.isError ? verify.error : activate.variables === order.id && activate.isError ? activate.error : reject.variables?.orderId === order.id && reject.isError ? reject.error : null;
        return <li key={order.id} className="bg-s1 border border-b1 rounded-xl p-4 text-sm space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>{order.user ? personLink(order.user.id, order.user.name) : 'Compte supprimé'} · {order.offer_label}</p>
            <span className="rounded-full border border-b1 px-2 py-0.5 text-xs text-gold">{paymentOrderLabel[order.status]}</span>
          </div>
          <p className="text-t2">{order.amount_fcfa.toLocaleString('fr-FR')} FCFA · {order.duration_months} mois · {channelLabel(order.channel)}</p>
          <p className="text-t3 break-all">Commande : {order.reference}{order.payment_reference ? ` · Paiement : ${order.payment_reference}` : ''}</p>
          <p className="text-xs text-t3 whitespace-pre-wrap">Instructions client : {order.payment_instructions}</p>
          {order.internal_notes && <p className="text-xs text-t3">Note interne : {order.internal_notes}</p>}
          {order.rejection_reason && <p className="text-red">Motif transmis : {order.rejection_reason}</p>}
          {order.status === 'payment_declared' && <Button size="sm" variant="gold" disabled={verify.isPending && verify.variables === order.id} onClick={() => verify.mutate(order.id)}>Commencer la vérification</Button>}
          {order.status === 'verifying' && <Button size="sm" variant="gold" disabled={activate.isPending && activate.variables === order.id} onClick={() => activate.mutate(order.id)}>Confirmer l’encaissement et activer</Button>}
          {canReject && <div className="flex flex-col sm:flex-row gap-2">
            <Input value={reason} onChange={(e) => setRejectionReasons((currentReasons) => ({ ...currentReasons, [order.id]: e.target.value }))} placeholder="Motif précis transmis au client" />
            <Button size="sm" variant="danger" disabled={(reject.isPending && reject.variables?.orderId === order.id) || reason.trim().length < 3} onClick={() => reject.mutate({ orderId: order.id, reason: reason.trim() })}>Refuser</Button>
          </div>}
          {error && <p role="alert" className="text-red">{error.message}</p>}
        </li>;
      })}
      {tab === 'grants' && grants.data?.data.map((grant) => <li key={grant.id} className="bg-s1 border border-b1 rounded-xl p-4 text-sm space-y-1">
        <p>{grant.user ? personLink(grant.user.id, grant.user.name) : 'Compte supprimé'} · {grantLabel[grant.status]}</p>
        <p className="text-t2">Du {date(grant.starts_at)} au {date(grant.ends_at)} · {grant.amount_fcfa === null ? 'Montant inconnu' : `${grant.amount_fcfa.toLocaleString('fr-FR')} FCFA`} · {channelLabel(grant.channel)}</p>
        <p className="text-t3 break-all">Référence : {grant.reference ?? 'Non renseignée'} · Accordé par {grant.creator?.name ?? 'Non renseigné'}</p>
      </li>)}
      {tab === 'credits' && credits.data?.data.map((entry) => <li key={entry.id} className="bg-s1 border border-b1 rounded-xl p-4 text-sm space-y-1">
        <p>{entry.user ? personLink(entry.user.id, entry.user.name) : 'Compte supprimé'} · {creditLabel[entry.type]} · {entry.amount > 0 ? '+' : ''}{entry.amount} crédits</p>
        <p className="text-t2">{date(entry.created_at)} · {entry.reason ?? 'Sans motif'} · {entry.author?.name ?? 'Système'}</p>
        <p className="text-t3 break-all">Référence : {entry.reference_id ?? 'Non renseignée'}</p>
      </li>)}
      {tab === 'untracked' && untracked.data?.data.map((user) => <li key={user.id} className="bg-s1 border border-b1 rounded-xl p-4 text-sm">{personLink(user.id, user.name)} · {user.email}</li>)}
    </ul>
    {current.data && <HistoryPagination page={page} lastPage={current.data.pagination.last_page} onChange={setPage} />}
  </div></AppLayout>;
}

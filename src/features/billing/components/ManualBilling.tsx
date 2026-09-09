import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getManualGrants, getCreditHistory } from '../api/manualBillingApi';
import type { BillingOverview } from '../types';
import { Button } from '@/shared/components/ui/Button';
import { channelLabel, creditLabel, grantLabel } from '../labels';

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
  const grants = useQuery({ queryKey: ['billing', 'manual-grants', page], queryFn: () => getManualGrants(page), refetchInterval: 30_000 });
  const credits = useQuery({ queryKey: ['billing', 'credits', creditPage], queryFn: () => getCreditHistory(creditPage), refetchInterval: 30_000 });
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

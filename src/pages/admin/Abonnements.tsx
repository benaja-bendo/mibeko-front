import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AppLayout from '@/widgets/layout/AppLayout';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { getBillingSummary, getAdminGrants, getAdminCredits, getUntrackedAccounts } from '@/features/admin/api/adminBillingApi';
import { HistoryPagination } from '@/features/billing/components/ManualBilling';
import { channelLabel, creditLabel, grantLabel } from '@/features/billing/labels';

type Tab = 'grants' | 'credits' | 'untracked';
const date = (value: string) => new Date(value).toLocaleDateString('fr-FR');

export default function Abonnements() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [tab, setTab] = useState<Tab>('grants');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const summary = useQuery({ queryKey: ['admin-billing', 'summary', month], queryFn: () => getBillingSummary(month), enabled: Boolean(month) });
  const grants = useQuery({ queryKey: ['admin-billing', 'grants', page, status], queryFn: () => getAdminGrants(page, status), enabled: tab === 'grants' });
  const credits = useQuery({ queryKey: ['admin-billing', 'credits', page], queryFn: () => getAdminCredits(page), enabled: tab === 'credits' });
  const untracked = useQuery({ queryKey: ['admin-billing', 'untracked', page], queryFn: () => getUntrackedAccounts(page), enabled: tab === 'untracked' });
  const current = tab === 'grants' ? grants : tab === 'credits' ? credits : untracked;
  const personLink = (id: string, name: string) => <Link className="text-gold underline" to={`/admin/utilisateurs?focus=${id}`}>{name}</Link>;

  return <AppLayout space="admin"><div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto w-full">
    <header className="space-y-2"><h1 className="text-2xl font-display text-t1">Abonnements et crédits</h1>
      <p className="text-sm text-t3">Enregistrez une vente depuis la fiche utilisateur, après vérification de l’encaissement.</p>
      <Link to="/admin/utilisateurs" className="text-gold underline">Enregistrer une vente ou créditer un compte</Link>
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
    <div className="flex gap-2 flex-wrap" aria-label="Vues de facturation">{([['grants', 'Abonnements'], ['credits', 'Grand livre de crédits'], ['untracked', 'Pro à vérifier']] as const).map(([value, label]) => <Button key={value} variant={tab === value ? 'gold' : 'outline'} aria-pressed={tab === value} onClick={() => { setTab(value); setPage(1); }}>{label}</Button>)}</div>
    {tab === 'grants' && <label className="block text-sm text-t2">Échéances <select className="bg-s1 border border-b1 rounded p-2" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
      <option value="">Tous les octrois</option><option value="active">Actifs</option><option value="expiring_7">Expire sous 7 jours</option><option value="expiring_30">Expire sous 30 jours</option><option value="ended">Terminés</option>
    </select></label>}
    {tab === 'untracked' && <p className="text-sm text-t3">Ces comptes portent le rôle user_pro sans octroi manuel actif. Vérifiez leur situation (accès offert, ancien rôle ou Stripe) avant toute régularisation. Aucun rôle n’est retiré automatiquement.</p>}
    {current.isPending && <p role="status">Chargement…</p>}
    {current.isError && <p role="alert">{current.error.message} <Button onClick={() => current.refetch()}>Réessayer la liste</Button></p>}
    {current.data?.data.length === 0 && <p className="text-t3">Aucun résultat pour cette vue.</p>}
    <ul className="space-y-3">
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

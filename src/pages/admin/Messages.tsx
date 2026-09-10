import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AppLayout from '@/widgets/layout/AppLayout';
import { Button } from '@/shared/components/ui/Button';
import { HistoryPagination } from '@/features/billing/components/ManualBilling';
import { exportNewsletter, type ContactStatus } from '@/features/admin/api/contactInboxApi';
import { useContactMessages, useHandleContact, useNewsletterSubscribers } from '@/features/admin/hooks/useContactInbox';

const profiles: Record<string, string> = { citoyen: 'Citoyen', professionnel: 'Professionnel', entreprise: 'Entreprise', autre: 'Autre' };
const date = (value: string) => new Date(value).toLocaleString('fr-FR');

export default function Messages() {
  const [tab, setTab] = useState<'messages' | 'newsletter'>('messages');
  const [status, setStatus] = useState<ContactStatus>('pending');
  const [page, setPage] = useState(1);
  const messages = useContactMessages(page, status, tab === 'messages');
  const subscribers = useNewsletterSubscribers(page, tab === 'newsletter');
  const update = useHandleContact();
  const download = useMutation({ mutationFn: exportNewsletter, onSuccess: (blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `abonnes-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } });
  const current = tab === 'messages' ? messages : subscribers;

  return <AppLayout space="admin"><div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto w-full">
    <header className="space-y-2"><h1 className="text-2xl font-display text-t1">Messages et contacts</h1>
      <p className="text-sm text-t3">Retrouvez les demandes reçues sur le site et marquez-les traitées après leur prise en charge.</p>
    </header>
    <div className="flex gap-2 flex-wrap" aria-label="Boîte de réception">
      <Button variant={tab === 'messages' ? 'gold' : 'outline'} aria-pressed={tab === 'messages'} onClick={() => { setTab('messages'); setPage(1); }}>Messages de contact</Button>
      <Button variant={tab === 'newsletter' ? 'gold' : 'outline'} aria-pressed={tab === 'newsletter'} onClick={() => { setTab('newsletter'); setPage(1); }}>Abonnés newsletter</Button>
    </div>
    {tab === 'messages' ? <label className="block text-sm text-t2">Statut des messages <select className="bg-s1 border border-b1 rounded p-2" value={status} onChange={(event) => { setStatus(event.target.value as ContactStatus); setPage(1); }}>
      <option value="pending">À traiter</option><option value="handled">Traités</option><option value="all">Tous</option>
    </select></label> : <Button variant="outline" disabled={download.isPending} onClick={() => download.mutate()}>{download.isPending ? 'Export en cours…' : 'Exporter tous les abonnés en CSV'}</Button>}
    {download.isError && tab === 'newsletter' && <p role="alert">L’export a échoué : {download.error.message}</p>}
    {update.isError && tab === 'messages' && <p role="alert">Le statut n’a pas été modifié : {update.error.message}</p>}
    {current.isPending && <p role="status">Chargement…</p>}
    {current.isError && <p role="alert">{current.error.message} <Button onClick={() => current.refetch()}>Réessayer la liste</Button></p>}
    {current.data && <p className="text-sm text-t3">{current.data.pagination.total} résultat(s)</p>}
    {current.data?.data.length === 0 && <p className="text-t2">{tab === 'messages' ? 'Aucun message dans cette vue.' : 'Aucun abonné newsletter.'}</p>}
    <ul className="space-y-3">
      {tab === 'messages' && messages.data?.data.map((message) => <li key={message.id} className="bg-s1 border border-b1 rounded-xl p-4 space-y-3">
        <div className="flex justify-between gap-3 flex-wrap"><h2 className="font-semibold text-t1 break-words">{message.name}</h2><span className="text-sm text-t3">{message.handled ? 'Traité' : 'À traiter'}</span></div>
        <p className="text-sm text-t2 break-all">{message.email} · {profiles[message.profile ?? ''] ?? 'Profil non précisé'}</p>
        <p className="text-xs text-t3">Reçu le {date(message.created_at)}</p>
        <p className="text-sm text-t1 whitespace-pre-wrap break-words">{message.message}</p>
        {message.account ? <Link className="text-sm text-gold underline" to={`/admin/utilisateurs?focus=${message.account.id}`}>Compte existant : {message.account.name}</Link> : <p className="text-xs text-t3">Aucun compte associé à cette adresse e-mail.</p>}
        <div><Button variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: message.id, handled: !message.handled })}>{message.handled ? 'Remettre à traiter' : 'Marquer traité'}</Button></div>
      </li>)}
      {tab === 'newsletter' && subscribers.data?.data.map((subscriber) => <li key={subscriber.id} className="bg-s1 border border-b1 rounded-xl p-4 text-sm space-y-1">
        <p className="text-t1 break-all">{subscriber.email}</p><p className="text-t3">Inscription : {date(subscriber.created_at)} · Source : {subscriber.source ?? 'Non renseignée'}</p>
      </li>)}
    </ul>
    {current.data && <HistoryPagination page={page} lastPage={current.data.pagination.last_page} onChange={setPage} />}
  </div></AppLayout>;
}

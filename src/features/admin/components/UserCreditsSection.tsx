import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserCredits, storeUserCredits } from '../api/adminBillingApi';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { HistoryPagination } from '@/features/billing/components/ManualBilling';
import { creditLabel } from '@/features/billing/labels';

export default function UserCreditsSection({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<'purchase' | 'correction'>('purchase');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin-billing', 'user', userId, page], queryFn: () => getUserCredits(userId, page) });
  const mutation = useMutation({
    mutationFn: () => storeUserCredits(userId, { type, amount: Number(amount), reason: reason.trim(), reference_id: reference.trim() }),
    onSuccess: () => { setEditing(false); setPage(1); void qc.invalidateQueries({ queryKey: ['admin-billing'] }); void qc.invalidateQueries({ queryKey: ['billing'] }); },
  });
  const valid = Number.isInteger(Number(amount)) && Number(amount) !== 0 && (type !== 'purchase' || Number(amount) > 0);

  return <section className="space-y-3 border border-b1 bg-s1 rounded-lg p-3">
    <h3 className="font-semibold text-t1">Crédits du compte{query.data ? ` : ${query.data.balance}` : ''}</h3>
    {query.isPending && <p role="status">Chargement des crédits…</p>}
    {query.isError && <p role="alert">{query.error.message} <Button variant="outline" onClick={() => query.refetch()}>Réessayer</Button></p>}
    <Button size="sm" variant="outline" onClick={() => { setEditing(!editing); setConfirmed(false); mutation.reset(); }}>Créditer ou corriger</Button>
    {editing && <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (confirmed && valid) mutation.mutate(); }}>
      <label className="block text-sm text-t2">Type
        <select className="w-full bg-s2 border border-b1 rounded p-2" value={type} onChange={(e) => { setType(e.target.value as typeof type); setConfirmed(false); }}>
          <option value="purchase">Achat de crédits</option><option value="correction">Correction signée (+ ou −)</option>
        </select>
      </label>
      <label className="block text-sm text-t2">Nombre de crédits<Input type="number" step="1" required min={type === 'purchase' ? 1 : -1000000} max={1000000} value={amount} onChange={(e) => { setAmount(e.target.value); setConfirmed(false); }} /></label>
      <label className="block text-sm text-t2">Motif obligatoire<Input required maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <label className="block text-sm text-t2">Référence unique de l’opération<Input required maxLength={36} value={reference} onChange={(e) => setReference(e.target.value)} /></label>
      <p className="text-xs text-t3">Réutilisez la même référence en cas de doute sur un enregistrement. Pour un achat, vérifiez d’abord l’encaissement.</p>
      <label className="flex gap-2 text-sm text-t2"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Je confirme {amount || '0'} crédits sur ce compte.</label>
      {mutation.isError && <p role="alert" className="text-red">{mutation.error.message}</p>}
      <Button type="submit" variant="gold" disabled={mutation.isPending || !confirmed || !valid || !reason.trim() || !reference.trim()}>{mutation.isPending ? 'Enregistrement…' : 'Enregistrer le mouvement'}</Button>
    </form>}
    {mutation.isSuccess && <p role="status" className="text-green">Mouvement enregistré.</p>}
    {query.data && <>
      {query.data.entries.data.length === 0 && <p className="text-sm text-t3">Aucun mouvement.</p>}
      <ul className="divide-y divide-b1">{query.data.entries.data.map((entry) => <li key={entry.id} className="py-2 text-xs text-t2 break-words">
        <p>{new Date(entry.created_at).toLocaleString('fr-FR')} · {creditLabel[entry.type]} · {entry.amount > 0 ? '+' : ''}{entry.amount}</p>
        <p>{entry.reason} · {entry.reference_id} · {entry.author?.name ?? 'Système'}</p>
      </li>)}</ul>
      <HistoryPagination page={page} lastPage={query.data.entries.last_page} onChange={setPage} />
    </>}
  </section>;
}

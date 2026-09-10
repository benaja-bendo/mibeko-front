import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGrantMovements, storeGrantMovement } from '../api/adminBillingApi';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { movementLabel } from '@/features/billing/labels';

/**
 * Grand livre FCFA d'un octroi — mibeko-dashboard#122. Remboursement ou
 * correction manuelle, jamais anonyme, jamais une réécriture d'un mouvement
 * existant. Couper l'accès reste une case à part, décochée par défaut : un
 * remboursement n'entraîne jamais la révocation sans confirmation explicite.
 */
export default function GrantMovementsPanel({ grantId }: { grantId: string }) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<'refund' | 'correction'>('refund');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [revokeAccess, setRevokeAccess] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin-billing', 'grant-movements', grantId], queryFn: () => getGrantMovements(grantId) });
  const mutation = useMutation({
    mutationFn: () => storeGrantMovement(grantId, {
      type, amount_fcfa: Number(amount), reason: reason.trim(), reference_id: reference.trim(), revoke_access: type === 'refund' ? revokeAccess : undefined,
    }),
    onSuccess: () => {
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ['admin-billing'] });
      void qc.invalidateQueries({ queryKey: ['billing'] });
      void qc.invalidateQueries({ queryKey: ['entitlements'] });
    },
  });
  const numericAmount = Number(amount);
  const valid = Number.isInteger(numericAmount) && numericAmount !== 0 && (type !== 'refund' || numericAmount < 0);

  return <div className="space-y-3 border-t border-b1 pt-3 mt-2">
    {query.isPending && <p role="status" className="text-xs text-t3">Chargement des mouvements…</p>}
    {query.isError && <p role="alert" className="text-xs text-red">{query.error.message}</p>}
    {query.data && <p className="text-xs text-t2">Encaissé : {query.data.collected_amount_fcfa.toLocaleString('fr-FR')} FCFA · Net : {query.data.net_amount_fcfa.toLocaleString('fr-FR')} FCFA</p>}
    <Button size="sm" variant="outline" onClick={() => { setEditing(!editing); setConfirmed(false); mutation.reset(); }}>Rembourser ou corriger</Button>
    {editing && <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (confirmed && valid) mutation.mutate(); }}>
      <label className="block text-sm text-t2">Type
        <select className="w-full bg-s2 border border-b1 rounded p-2" value={type} onChange={(e) => { setType(e.target.value as typeof type); setConfirmed(false); }}>
          <option value="refund">Remboursement (négatif)</option><option value="correction">Correction signée (+ ou −)</option>
        </select>
      </label>
      <label className="block text-sm text-t2">Montant FCFA<Input type="number" step="1" required max={type === 'refund' ? -1 : 1000000000} min={-1000000000} value={amount} onChange={(e) => { setAmount(e.target.value); setConfirmed(false); }} /></label>
      <label className="block text-sm text-t2">Motif obligatoire<Input required maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <label className="block text-sm text-t2">Référence unique de l’opération<Input required maxLength={64} value={reference} onChange={(e) => setReference(e.target.value)} /></label>
      {type === 'refund' && <label className="flex gap-2 text-sm text-t2"><input type="checkbox" checked={revokeAccess} onChange={(e) => setRevokeAccess(e.target.checked)} />Couper l’accès Pro de ce compte</label>}
      <label className="flex gap-2 text-sm text-t2"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Je confirme {amount || '0'} FCFA sur cet octroi{type === 'refund' && revokeAccess ? ', et la coupure de l’accès' : ''}.</label>
      {mutation.isError && <p role="alert" className="text-red">{mutation.error.message}</p>}
      <Button type="submit" variant="gold" disabled={mutation.isPending || !confirmed || !valid || !reason.trim() || !reference.trim()}>{mutation.isPending ? 'Enregistrement…' : 'Enregistrer le mouvement'}</Button>
    </form>}
    {mutation.isSuccess && <p role="status" className="text-green">Mouvement enregistré.</p>}
    {query.data && <ul className="divide-y divide-b1">{query.data.movements.map((m) => <li key={m.id} className="py-2 text-xs text-t2 break-words">
      <p>{new Date(m.occurred_at).toLocaleString('fr-FR')} · {movementLabel[m.type]} · {m.amount_fcfa > 0 ? '+' : ''}{m.amount_fcfa.toLocaleString('fr-FR')} FCFA</p>
      <p>{m.reason ?? 'Sans motif'} · {m.reference_id ?? 'Sans référence'} · {m.author?.name ?? 'Système'}</p>
    </li>)}</ul>}
  </div>;
}

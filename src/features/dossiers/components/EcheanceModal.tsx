/**
 * EcheanceModal.tsx — Création / édition d'une échéance de dossier.
 *
 * Saisie minimale (type, intitulé, date, statut, note). Les rappels par défaut
 * (J-15/7/2/0) sont posés à la création ; leur réglage fin viendra avec le
 * calculateur de délais (Palier 2).
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import {
  useCreateEcheance,
  useUpdateEcheance,
} from '@/features/dossiers/hooks/useDossiers';
import {
  ECHEANCE_STATUS_META,
  ECHEANCE_TYPE_META,
  type Echeance,
  type EcheanceInput,
  type EcheanceStatus,
  type EcheanceType,
} from '@/features/dossiers/types';

interface EcheanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  /** Échéance à éditer ; absente = création. */
  echeance?: Echeance | null;
}

const DEFAULT_REMINDERS = [15, 7, 2, 0];

const EMPTY = {
  type: 'audience' as EcheanceType,
  title: '',
  dueDate: '',
  status: 'a_venir' as EcheanceStatus,
  note: '',
};

const selectClass =
  'h-9 w-full rounded-md border border-b1 bg-s2 px-2 text-sm text-t1 focus:outline-none focus:ring-1 focus:ring-gold';

export default function EcheanceModal({
  open,
  onOpenChange,
  dossierId,
  echeance,
}: EcheanceModalProps) {
  const createEcheance = useCreateEcheance();
  const updateEcheance = useUpdateEcheance();
  const isEditing = Boolean(echeance);
  const pending = createEcheance.isPending || updateEcheance.isPending;

  const [form, setForm] = useState(EMPTY);

  // (Ré)initialise le formulaire à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    setForm(
      echeance
        ? {
            type: echeance.type,
            title: echeance.title,
            dueDate: echeance.dueDate ?? '',
            status: echeance.status,
            note: echeance.note ?? '',
          }
        : EMPTY,
    );
  }, [open, echeance]);

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.title.trim() || pending) return;

    const input: EcheanceInput = {
      type: form.type,
      title: form.title.trim(),
      dueDate: form.dueDate || null,
      status: form.status,
      note: form.note || null,
    };

    if (echeance) {
      await updateEcheance.mutateAsync({ id: echeance.id, patch: input });
    } else {
      await createEcheance.mutateAsync({
        dossierId,
        input: { ...input, reminders: DEFAULT_REMINDERS },
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier l\'échéance' : 'Nouvelle échéance'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ech-title">Intitulé *</Label>
            <Input
              id="ech-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ex. Audience de plaidoirie"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ech-type">Type</Label>
              <select
                id="ech-type"
                value={form.type}
                onChange={(e) => set('type', e.target.value as EcheanceType)}
                className={selectClass}
              >
                {Object.entries(ECHEANCE_TYPE_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ech-due">Date d'échéance</Label>
              <Input
                id="ech-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </div>
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="ech-status">Statut</Label>
              <select
                id="ech-status"
                value={form.status}
                onChange={(e) => set('status', e.target.value as EcheanceStatus)}
                className={selectClass}
              >
                {Object.entries(ECHEANCE_STATUS_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ech-note">Note</Label>
            <textarea
              id="ech-note"
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              rows={2}
              placeholder="Précision, base légale, rappel interne…"
              className="w-full resize-none rounded-md border border-b1 bg-s2 px-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>

          {(createEcheance.isError || updateEcheance.isError) && (
            <p className="rounded-md bg-red-d px-3 py-2 text-[11px] text-red">
              L'enregistrement a échoué. Réessayez.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="gold"
            onClick={submit}
            disabled={!form.title.trim() || pending}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

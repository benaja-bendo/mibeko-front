import React from 'react';
import { useInstitutionMutations } from '@/features/admin/hooks/useAdmin';
import type { InstitutionRef } from '@/features/admin/api/adminApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { Building2 } from 'lucide-react';

/** Création / édition d'une institution émettrice. */
export default function InstitutionModal({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: InstitutionRef | null;
}) {
  const { create, update } = useInstitutionMutations();
  const isEdit = !!record;

  const [name, setName] = React.useState('');
  const [acronym, setAcronym] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setName(record?.name ?? '');
      setAcronym(record?.acronym ?? '');
    }
  }, [open, record]);

  const pending = create.isPending || update.isPending;
  const error = (create.error || update.error) as Error | null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: name.trim(), acronym: acronym.trim() || null };
    if (isEdit && record) {
      update.mutate({ id: record.id, payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {isEdit ? "Modifier l'institution" : 'Nouvelle institution'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input
              placeholder="Ex: Assemblée Nationale"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Sigle <span className="text-t4 font-mono text-[10px]">(optionnel)</span></Label>
            <Input
              placeholder="Ex: AN"
              value={acronym}
              onChange={(e) => setAcronym(e.target.value)}
            />
          </div>

          {error && <p className="text-red text-[11px] font-mono">{error.message}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="gold" disabled={pending || !name.trim()}>
              {pending ? 'Enregistrement…' : isEdit ? 'Sauvegarder' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

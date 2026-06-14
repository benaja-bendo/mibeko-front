import React from 'react';
import { useDocumentTypeMutations } from '@/features/admin/hooks/useAdmin';
import type { DocumentTypeRef } from '@/features/admin/api/adminApi';
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
import { BookText } from 'lucide-react';

/**
 * Création / édition d'un type de document (« type de loi »).
 *
 * Le `code` n'est saisissable qu'à la création : c'est la clé primaire
 * référencée par les documents, donc figée ensuite (affichée en lecture seule).
 */
export default function DocumentTypeModal({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Type à éditer ; absent = création. */
  record?: DocumentTypeRef | null;
}) {
  const { create, update } = useDocumentTypeMutations();
  const isEdit = !!record;

  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [level, setLevel] = React.useState('100');

  React.useEffect(() => {
    if (open) {
      setCode(record?.code ?? '');
      setName(record?.name ?? '');
      setLevel(String(record?.hierarchy_level ?? 100));
    }
  }, [open, record]);

  const pending = create.isPending || update.isPending;
  const error = (create.error || update.error) as Error | null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hierarchy_level = Number(level);
    if (isEdit && record) {
      update.mutate(
        { code: record.code, payload: { name: name.trim(), hierarchy_level } },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(
        { code: code.trim(), name: name.trim(), hierarchy_level },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookText className="w-5 h-5" />
            {isEdit ? 'Modifier le type' : 'Nouveau type de document'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Code {isEdit && <span className="text-t4 font-mono text-[10px]">(non modifiable)</span>}</Label>
            <Input
              placeholder="Ex: LOI, DEC, ARR"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={isEdit}
              required={!isEdit}
              className="font-mono uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label>Libellé</Label>
            <Input
              placeholder="Ex: Loi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Niveau hiérarchique</Label>
            <Input
              type="number"
              min={0}
              max={1000}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              required
            />
            <p className="text-t4 text-[11px]">
              Plus le nombre est petit, plus le texte prime (0 = Constitution).
            </p>
          </div>

          {error && <p className="text-red text-[11px] font-mono">{error.message}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="gold" disabled={pending || !name.trim() || (!isEdit && !code.trim())}>
              {pending ? 'Enregistrement…' : isEdit ? 'Sauvegarder' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

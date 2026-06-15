import React from 'react';
import { useTagMutations } from '@/features/admin/hooks/useAdmin';
import type { TagRef } from '@/features/admin/api/adminApi';
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
import { Tag as TagIcon } from 'lucide-react';

/**
 * Création / édition d'un tag. Le slug est facultatif : laissé vide, il est
 * dérivé du nom côté backend.
 */
export default function TagModal({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: TagRef | null;
}) {
  const { create, update } = useTagMutations();
  const isEdit = !!record;

  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [icon, setIcon] = React.useState('');
  const [description, setDescription] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setName(record?.name ?? '');
      setSlug(record?.slug ?? '');
      setIcon(record?.icon ?? '');
      setDescription(record?.description ?? '');
    }
  }, [open, record]);

  const pending = create.isPending || update.isPending;
  const error = (create.error || update.error) as Error | null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      ...(slug.trim() ? { slug: slug.trim() } : {}),
      icon: icon.trim() || null,
      description: description.trim() || null,
    };
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
            <TagIcon className="w-5 h-5" />
            {isEdit ? 'Modifier le thème' : 'Nouveau thème'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input
              placeholder="Ex: Travail & emploi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Slug <span className="text-t4 font-mono text-[10px]">(optionnel)</span></Label>
              <Input
                placeholder="Auto-généré"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Icône <span className="text-t4 font-mono text-[10px]">(lucide)</span></Label>
              <Input
                placeholder="Ex: briefcase"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description <span className="text-t4 font-mono text-[10px]">(optionnel)</span></Label>
            <Input
              placeholder="Ex: Contrat, licenciement, salaire…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

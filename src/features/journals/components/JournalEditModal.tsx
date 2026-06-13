import React from 'react';
import type { OfficialJournal } from '@/features/journals/api/journalsApi';
import { useJournalMutations } from '@/features/journals/hooks/useJournals';
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
import { FilePen } from 'lucide-react';

/** Édition des métadonnées d'un journal officiel (PATCH /official-journals/{id}). */
export default function JournalEditModal({
  journal,
  open,
  onOpenChange,
}: {
  journal: OfficialJournal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { update } = useJournalMutations(journal.id);

  const [title, setTitle] = React.useState('');
  const [number, setNumber] = React.useState('');
  const [publicationDate, setPublicationDate] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setTitle(journal.title || '');
      setNumber(journal.number || '');
      setPublicationDate(journal.publication_date?.slice(0, 10) || '');
    }
  }, [open, journal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      title: title.trim(),
      number: number.trim() || null,
      publication_date: publicationDate || null,
    }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePen className="w-5 h-5" />
            Modifier le journal officiel
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input
              placeholder="Ex: Journal Officiel n° 12 - 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Numéro</Label>
              <Input
                placeholder="Ex: 12"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date de publication</Label>
              <Input
                type="date"
                value={publicationDate}
                onChange={(e) => setPublicationDate(e.target.value)}
              />
            </div>
          </div>

          {update.isError && (
            <p className="text-red text-[11px] font-mono">
              La mise à jour a échoué. Réessayez.
            </p>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="gold" disabled={update.isPending || !title.trim()}>
              {update.isPending ? 'Enregistrement...' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Label } from '@/shared/components/ui/Label';

/** Rejette une relation candidate — conservée en base, jamais re-proposée par le détecteur. */
export default function RejectRelationDialog({
  open,
  onOpenChange,
  description,
  onConfirm,
  pending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  onConfirm: (commentaire: string) => void;
  pending?: boolean;
  error?: Error | null;
}) {
  const [commentaire, setCommentaire] = React.useState('');

  React.useEffect(() => {
    if (open) setCommentaire('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rejeter cette relation ?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="reject-relation-commentaire">Motif (optionnel)</Label>
          <textarea
            id="reject-relation-commentaire"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={3}
            placeholder="Ex : mauvaise cible, référence ambiguë…"
            className="w-full rounded-lg border border-b1 bg-s2 px-3 py-2 text-[13px] text-t1 placeholder:text-t4 focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>

        {error && <p className="text-red text-[11px] font-mono">{error.message}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="danger" size="sm" disabled={pending} onClick={() => onConfirm(commentaire.trim())}>
            {pending ? 'Rejet…' : 'Rejeter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

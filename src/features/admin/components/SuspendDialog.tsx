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
import { Ban } from 'lucide-react';

/** Confirmation de suspension d'un compte avec motif (tracé et affiché ensuite). */
export default function SuspendDialog({
  open,
  onOpenChange,
  userName,
  onConfirm,
  pending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirm: (reason: string) => void;
  pending?: boolean;
  error?: Error | null;
}) {
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-red" />
            Suspendre {userName}
          </DialogTitle>
          <DialogDescription>
            L'utilisateur sera déconnecté immédiatement et ne pourra plus se connecter jusqu'à
            réactivation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>
            Motif <span className="text-t4 font-mono text-[10px]">(optionnel)</span>
          </Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ex : non-respect des conditions d'utilisation"
            className="w-full rounded-lg border border-b1 bg-s2 px-3 py-2 text-[13px] text-t1 placeholder:text-t4 focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>

        {error && <p className="text-red text-[11px] font-mono">{error.message}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="danger" size="sm" disabled={pending} onClick={() => onConfirm(reason.trim())}>
            {pending ? 'Suspension…' : 'Suspendre'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

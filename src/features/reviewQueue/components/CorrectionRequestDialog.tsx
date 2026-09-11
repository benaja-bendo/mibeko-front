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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/Select';
import type { CorrectionRequestSeverity } from '../api/reviewQueueApi';

/** Transmet une demande de correction tracée sur un document de la file de revue. */
export default function CorrectionRequestDialog({
  open,
  onOpenChange,
  documentTitle,
  onConfirm,
  pending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle: string;
  onConfirm: (description: string, severity: CorrectionRequestSeverity) => void;
  pending?: boolean;
  error?: Error | null;
}) {
  const [description, setDescription] = React.useState('');
  const [severity, setSeverity] = React.useState<CorrectionRequestSeverity>('blocking');

  React.useEffect(() => {
    if (open) {
      setDescription('');
      setSeverity('blocking');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Demander une correction</DialogTitle>
          <DialogDescription>
            {documentTitle} — la demande est tracée et visible dans la file de revue et le panneau
            du document.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>Motif</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Ex : la date de signature ne correspond pas au PDF source."
              className="w-full rounded-lg border border-b1 bg-s2 px-3 py-2 text-[13px] text-t1 placeholder:text-t4 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div className="space-y-2">
            <Label>Sévérité</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as CorrectionRequestSeverity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blocking">Bloquant — empêche la publication</SelectItem>
                <SelectItem value="warning">Avertissement — n'empêche pas la publication</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <p className="text-red text-[11px] font-mono">{error.message}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="gold"
            size="sm"
            disabled={pending || description.trim().length === 0}
            onClick={() => onConfirm(description.trim(), severity)}
          >
            {pending ? 'Envoi…' : 'Transmettre'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React from 'react';
import { useAiQuotaTierMutations } from '@/features/admin/hooks/useAdmin';
import type { AiQuotaTierRef } from '@/features/admin/api/adminApi';
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
import { Sparkles } from 'lucide-react';

const TIER_LABELS: Record<AiQuotaTierRef['tier'], string> = {
  standard: 'Compte gratuit',
  user_pro: 'Pro',
  admin: 'Administrateur',
};

/**
 * Édition de la limite d'un palier de quota IA — mibeko-dashboard#95.
 *
 * Ne porte jamais la portée (jour/mois) : elle reste fixée par le rôle côté
 * serveur (`AiUserQuotaTier::tierDefinition()`), pas éditable ici à dessein —
 * c'est ce qui empêche de réactiver par la bande la bascule journalière du
 * palier gratuit, toujours conditionnée à un préalable non construit.
 */
export default function AiQuotaTierModal({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AiQuotaTierRef | null;
}) {
  const { update } = useAiQuotaTierMutations();
  const [limit, setLimit] = React.useState('');

  React.useEffect(() => {
    if (open && record) setLimit(String(record.limit));
  }, [open, record]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    update.mutate(
      { tier: record.tier, limit: Number(limit) },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {record ? TIER_LABELS[record.tier] : ''}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Limite ({record?.scope === 'day' ? 'par jour' : 'par mois'})</Label>
            <Input
              type="number"
              min={1}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              required
              autoFocus
            />
          </div>

          {update.isError && (
            <p className="text-red text-[11px] font-mono">{(update.error as Error).message}</p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="gold" disabled={update.isPending || !limit}>
              {update.isPending ? 'Enregistrement…' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

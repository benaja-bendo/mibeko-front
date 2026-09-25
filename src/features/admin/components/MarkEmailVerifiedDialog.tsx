import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { MailCheck } from 'lucide-react';

/**
 * Confirmation avant de marquer une adresse comme vérifiée sans e-mail —
 * mibeko-dashboard#203. Le bouton validait en un clic, à côté de « Renvoyer le
 * lien » : sur une adresse mal saisie (`09gmail.com`, vue en prod), le mauvais
 * clic rend le compte inatteignable, puisque « mot de passe oublié » passe par
 * cette même adresse.
 */
export default function MarkEmailVerifiedDialog({
  open,
  onOpenChange,
  email,
  onConfirm,
  pending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onConfirm: () => void;
  pending?: boolean;
  error?: Error | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Marquer l’adresse comme vérifiée ?</DialogTitle>
          <DialogDescription>
            Aucun e-mail n’est envoyé : {email} sera tenue pour valide sans que la personne l’ait prouvée. Si elle
            contient une faute de frappe, le compte ne pourra plus récupérer son mot de passe. À réserver à une adresse
            confirmée autrement ; sinon, renvoyez le lien.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-red text-[11px] font-mono">{error.message}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="gold" size="sm" disabled={pending} onClick={onConfirm} className="gap-2">
            <MailCheck className="w-3.5 h-3.5" />
            {pending ? 'Enregistrement…' : 'Marquer comme vérifiée'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

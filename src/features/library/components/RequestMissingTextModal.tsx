import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { useRequestMissingText } from '@/features/library/hooks/useMissingTextRequests';

/**
 * « Demander ce texte » (mibeko-front#34) : accusé de réception immédiat,
 * la demande reste consultable ensuite dans la liste « Vos demandes »
 * (voir `EmptySearchState`).
 */
export default function RequestMissingTextModal({
  open,
  onOpenChange,
  initialQuery,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery: string;
}) {
  const [description, setDescription] = useState(initialQuery);
  const [sent, setSent] = useState(false);
  const request = useRequestMissingText();

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      // Repart propre à la prochaine ouverture (nouvelle recherche possible).
      setSent(false);
      request.reset();
    }
  };

  const submit = () => {
    if (!description.trim()) return;
    request.mutate(description.trim(), { onSuccess: () => setSent(true) });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>Demande enregistrée</DialogTitle>
              <DialogDescription>
                Votre demande a bien été transmise à l’équipe éditoriale. Retrouvez-la à
                tout moment dans « Vos demandes de texte », sous la recherche.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="gold" size="sm" onClick={() => close(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Demander ce texte</DialogTitle>
              <DialogDescription>
                Le catalogue ne le trouve pas aujourd’hui — décrivez ce que vous
                cherchez, nous ne disons pas qu’il n’existe pas.
              </DialogDescription>
            </DialogHeader>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex. : le Code minier, un décret d’application récent…"
              rows={4}
              maxLength={5000}
              className="w-full rounded-md border border-b1 bg-s1 p-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:ring-1 focus:ring-gold"
            />

            {request.isError && (
              <p className="text-[11px] text-red">{request.error.message}</p>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => close(false)}>
                Annuler
              </Button>
              <Button
                variant="gold"
                size="sm"
                disabled={request.isPending || !description.trim()}
                onClick={submit}
              >
                {request.isPending ? 'Envoi…' : 'Envoyer la demande'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

import React from 'react';
import { useParams } from 'react-router-dom';
import { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';
import type { TreeNode } from '@/shared/types/database';
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
import { Calendar } from 'lucide-react';

export default function ValidityModal({ open, onOpenChange, node }: { open: boolean, onOpenChange: (open: boolean) => void, node: TreeNode | null }) {
  const { id: documentId } = useParams<{ id: string }>();
  const { updateArticle } = useDocumentMutations(documentId || '');

  const [validity, setValidity] = React.useState('');

  React.useEffect(() => {
    if (open && node) {
      setValidity(node.validity || '');
    }
  }, [open, node]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!node) return;

    // TODO(#validité-non-persistée) : ce formulaire ne sauvegarde encore rien.
    // La période de validité vit sur `ArticleVersion.validity_period` (daterange
    // Postgres, voir Article::activeVersion), pas sur l'article lui-même — un
    // simple PATCH articles/{id} ne peut pas l'écrire. Il manque une route
    // dédiée (ou de réutiliser `articles/{id}/versions`) et une décision produit
    // sur ce qui arrive à la version courante quand la période change.
    // En attendant, on ferme sans rien envoyer plutôt que d'écrire un
    // `validation_status` sans rapport — cette ligne, avant, renvoyait
    // silencieusement « pending » pour un article en brouillon à chaque
    // ouverture de ce formulaire.
    onOpenChange(false);
  };

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Période de validité
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Date d'entrée en vigueur</Label>
            <Input 
              type="date"
              placeholder="Sélectionner une date" 
              value={validity.split(' au ')[0] || ''}
              onChange={(e) => setValidity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Date de fin (optionnel)</Label>
            <Input 
              type="date"
              placeholder="Sélectionner une date" 
              value={validity.split(' au ')[1] || ''}
              onChange={(e) => setValidity(v => v.split(' au ')[0] + ' au ' + e.target.value)}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="gold" disabled={updateArticle.isPending}>
              {updateArticle.isPending ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

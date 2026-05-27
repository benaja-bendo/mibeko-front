import React from 'react';
import { useParams } from 'react-router-dom';
import { useDocumentMutations } from '../../hooks/useDocumentData';
import type { TreeNode } from '../../types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
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

    updateArticle.mutate({
      id: node.id,
      // In a real app, this might be a date range or specific field
      // For now, we'll assume we can pass it as part of update
      validation_status: node.vs === 'ok' ? 'validated' : node.vs === 'err' ? 'error' : 'pending'
    }, {
      onSuccess: () => onOpenChange(false)
    });
    
    // Note: The API might need a specific field for validity range.
    // For this simulation, we just close the modal.
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

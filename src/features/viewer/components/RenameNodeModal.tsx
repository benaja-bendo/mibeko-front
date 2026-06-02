import React from 'react';
import { useParams } from 'react-router-dom';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';
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
import { Edit2 } from 'lucide-react';

export default function RenameNodeModal() {
  const { id: documentId } = useParams<{ id: string }>();
  const { renameModalOpen, renameNode, setRenameModal } = useViewerStore();
  const { updateNode, updateArticle } = useDocumentMutations(documentId || '');

  const [numero, setNumero] = React.useState('');
  const [titre, setTitre] = React.useState('');

  React.useEffect(() => {
    if (renameModalOpen && renameNode) {
      setNumero(renameNode.numero || '');
      setTitre(renameNode.label || '');
    }
  }, [renameModalOpen, renameNode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameNode) return;

    if (renameNode.type === 'ARTICLE') {
      updateArticle.mutate({
        id: renameNode.id,
        numero_article: numero,
      }, {
        onSuccess: () => setRenameModal(false)
      });
    } else {
      updateNode.mutate({
        id: renameNode.id,
        numero: numero,
        titre: titre,
      }, {
        onSuccess: () => setRenameModal(false)
      });
    }
  };

  if (!renameNode) return null;

  return (
    <Dialog open={renameModalOpen} onOpenChange={(open) => setRenameModal(open)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            Modifier l'élément
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{renameNode.type === 'ARTICLE' ? 'Numéro de l\'article' : 'Numéro / Préfixe'}</Label>
              <Input 
                placeholder="Ex: 123-1, LIVRE I..." 
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </div>

            {renameNode.type !== 'ARTICLE' && (
              <div className="space-y-2">
                <Label>Titre / Libellé</Label>
                <Input 
                  placeholder="Ex: Dispositions générales" 
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setRenameModal(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="gold" disabled={updateNode.isPending || updateArticle.isPending}>
              {updateNode.isPending || updateArticle.isPending ? 'Enregistrement...' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

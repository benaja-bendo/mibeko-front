import { useParams } from 'react-router-dom';
import { useViewerStore } from '../../store/useViewerStore';
import { useDocumentMutations } from '../../hooks/useDocumentData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function DeleteConfirmModal() {
  const { id: documentId } = useParams<{ id: string }>();
  const { deleteModalOpen, deleteNode, setDeleteModal } = useViewerStore();
  const { deleteNode: deleteNodeMutation } = useDocumentMutations(documentId || '');

  const handleDelete = () => {
    if (!deleteNode) return;

    if (deleteNode.type === 'ARTICLE') {
      // Assuming we have a delete article mutation, or using updateArticle to archive
      // For now, let's assume deleteNodeMutation handles both if the API is generic enough
      // or we can add a specific deleteArticle mutation in useDocumentData.
      deleteNodeMutation.mutate(deleteNode.id, {
        onSuccess: () => setDeleteModal(false)
      });
    } else {
      deleteNodeMutation.mutate(deleteNode.id, {
        onSuccess: () => setDeleteModal(false)
      });
    }
  };

  if (!deleteNode) return null;

  return (
    <Dialog open={deleteModalOpen} onOpenChange={(open) => setDeleteModal(open)}>
      <DialogContent className="sm:max-w-[400px] border-red/20">
        <DialogHeader className="items-center sm:items-start">
          <div className="w-10 h-10 rounded-full bg-red/10 flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5 text-red" />
          </div>
          <DialogTitle className="text-red">Supprimer l'élément ?</DialogTitle>
          <DialogDescription className="text-center sm:text-left pt-2">
            Êtes-vous sûr de vouloir supprimer <strong>{deleteNode.type === 'ARTICLE' ? 'l\'article' : 'la division'} {deleteNode.numero || ''} {deleteNode.label || ''}</strong> ? 
            <br />
            <span className="text-red/80 font-medium text-[12px] mt-2 block">
              Cette action est irréversible et supprimera également tous les sous-éléments associés.
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-6 sm:space-x-3 gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setDeleteModal(false)} className="flex-1 sm:flex-none">
            Annuler
          </Button>
          <Button 
            type="button" 
            variant="danger" 
            onClick={handleDelete} 
            disabled={deleteNodeMutation.isPending}
            className="flex-1 sm:flex-none bg-red text-white hover:bg-red/90"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleteNodeMutation.isPending ? 'Suppression...' : 'Supprimer définitivement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

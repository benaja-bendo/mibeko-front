import { useNavigate, useParams } from 'react-router-dom';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';
import { deleteLegalDocument } from '@/features/documents/api/laravelApi';
import DeletionImpactPanel from '@/features/documents/components/DeletionImpactPanel';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function DeleteConfirmModal() {
  const { id: documentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { deleteModalOpen, deleteNode, setDeleteModal } = useViewerStore();
  const { deleteNode: deleteNodeMutation, deleteArticle: deleteArticleMutation } = useDocumentMutations(documentId || '');
  const deleteDocumentMutation = useMutation({
    // Suppression COMPLÈTE (force) : document + arbre + articles + versions +
    // anomalies + relations + thèmes + fichiers (cf. DocumentDeletionService).
    mutationFn: (id: string) => deleteLegalDocument(id, true),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDeleteModal(false);
      navigate('/editor/documents');
    },
  });

  /**
   * Retourne un libellé sûr pour l'élément ciblé, quel que soit son type.
   */
  const getDeleteLabel = () => {
    if (!deleteNode) return '';
    if (deleteNode.type === 'DOCUMENT') {
      return deleteNode.content || deleteNode.id;
    }
    if ('numero' in deleteNode && 'label' in deleteNode) {
      return [deleteNode.numero, deleteNode.label].filter(Boolean).join(' ');
    }
    return deleteNode.id;
  };

  /**
   * Supprime le document entier ou un noeud de structure selon la cible courante.
   */
  const handleDelete = () => {
    if (!deleteNode) return;

    if (deleteNode.type === 'DOCUMENT') {
      deleteDocumentMutation.mutate(deleteNode.id);
      return;
    }

    if (deleteNode.type === 'ARTICLE') {
      deleteArticleMutation.mutate(deleteNode.id, {
        onSuccess: () => setDeleteModal(false)
      });
    } else {
      deleteNodeMutation.mutate(deleteNode.id, {
        onSuccess: () => setDeleteModal(false)
      });
    }
  };

  if (!deleteNode) return null;

  const isDocument = deleteNode.type === 'DOCUMENT';
  const isPending = deleteNodeMutation.isPending || deleteArticleMutation.isPending || deleteDocumentMutation.isPending;

  return (
    <Dialog open={deleteModalOpen} onOpenChange={(open) => setDeleteModal(open)}>
      <DialogContent className="sm:max-w-[440px] border-red/20">
        <DialogHeader className="items-center sm:items-start">
          <div className="w-10 h-10 rounded-full bg-red/10 flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5 text-red" />
          </div>
          <DialogTitle className="text-red">Supprimer l'élément ?</DialogTitle>
          <DialogDescription className="text-center sm:text-left pt-2">
            Êtes-vous sûr de vouloir supprimer <strong>{deleteNode.type === 'ARTICLE' ? 'l\'article' : isDocument ? 'le document' : 'la division'} {getDeleteLabel()}</strong> ?
            <br />
            <span className="text-red/80 font-medium text-[12px] mt-2 block">
              Cette action est irréversible et supprimera également tous les sous-éléments associés.
            </span>
          </DialogDescription>
        </DialogHeader>

        {isDocument && documentId && <DeletionImpactPanel documentId={documentId} />}

        <DialogFooter className="pt-6 sm:space-x-3 gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setDeleteModal(false)} className="flex-1 sm:flex-none">
            Annuler
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={isPending}
            className="flex-1 sm:flex-none bg-red text-white hover:bg-red/90"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isPending ? 'Suppression...' : 'Supprimer définitivement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React from 'react';
import { useParams } from 'react-router-dom';
import { useViewerStore } from '../../store/useViewerStore';
import { useDocumentMutations } from '../../hooks/useDocumentData';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Plus, LayoutTemplate, Type } from 'lucide-react';

export default function AddElementModal() {
  const { id: documentId } = useParams<{ id: string }>();
  const { addElementModalOpen, addElementParentId, addElementType, addElementSortOrder, setAddElementModal } = useViewerStore();
  const { createNode, createArticle } = useDocumentMutations(documentId || '');

  const [type, setType] = React.useState<'NODE' | 'ARTICLE'>('NODE');
  const [nodeType, setNodeType] = React.useState('TITRE');
  const [numero, setNumero] = React.useState('');
  const [titre, setTitre] = React.useState('');
  const [content, setContent] = React.useState('');

  React.useEffect(() => {
    if (addElementModalOpen) {
      setNumero('');
      setTitre('');
      setContent('');
      // Default to ARTICLE if adding to a node that isn't a root,
      // or based on user preference. For now, default to NODE.
      setType('NODE');
    }
  }, [addElementModalOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'ARTICLE') {
      createArticle.mutate({
        parent_node_id: addElementParentId!,
        numero_article: numero,
        content: content,
        ordre_affichage: addElementSortOrder,
      }, {
        onSuccess: () => setAddElementModal(false)
      });
    } else {
      createNode.mutate({
        parent_id: addElementParentId || undefined,
        type_unite: nodeType,
        titre: titre,
        numero: numero,
        sort_order: addElementSortOrder,
      }, {
        onSuccess: () => setAddElementModal(false)
      });
    }
  };

  return (
    <Dialog open={addElementModalOpen} onOpenChange={(open) => setAddElementModal(open)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {addElementType === 'ROOT' ? 'Ajouter un élément racine' : 'Ajouter un sous-élément'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Type Selection (only if not root) */}
          {addElementType === 'CHILD' && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-s2 rounded-lg">
              <button
                type="button"
                onClick={() => setType('NODE')}
                className={`flex items-center justify-center gap-2 h-8 rounded-md text-[11px] font-medium transition-all ${
                  type === 'NODE' ? 'bg-s1 text-gold shadow-sm' : 'text-t3 hover:text-t2'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                Structure
              </button>
              <button
                type="button"
                onClick={() => setType('ARTICLE')}
                className={`flex items-center justify-center gap-2 h-8 rounded-md text-[11px] font-medium transition-all ${
                  type === 'ARTICLE' ? 'bg-s1 text-gold shadow-sm' : 'text-t3 hover:text-t2'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                Article
              </button>
            </div>
          )}

          {type === 'NODE' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type de division</Label>
                <Select value={nodeType} onValueChange={setNodeType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIVRE">Livre</SelectItem>
                    <SelectItem value="TITRE">Titre</SelectItem>
                    <SelectItem value="PARTIE">Partie</SelectItem>
                    <SelectItem value="CHAPITRE">Chapitre</SelectItem>
                    <SelectItem value="SECTION">Section</SelectItem>
                    <SelectItem value="SOUS_SECTION">Sous-section</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 space-y-2">
                  <Label>N°</Label>
                  <Input
                    placeholder="I, 1er..."
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>Titre / Libellé</Label>
                  <Input
                    placeholder="Ex: Dispositions générales"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Numéro de l'article</Label>
                <Input
                  placeholder="Ex: L. 123-1"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Contenu initial</Label>
                <textarea
                  className="w-full bg-s2 border border-b1 rounded-md p-3 text-sm text-t1 font-serif leading-relaxed min-h-[120px] outline-none focus:ring-1 focus:ring-gold"
                  placeholder="Saisissez le texte de l'article..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setAddElementModal(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="gold" disabled={createNode.isPending || createArticle.isPending}>
              {createNode.isPending || createArticle.isPending ? 'Création...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

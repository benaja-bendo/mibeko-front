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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/Select';
import { Plus, LayoutTemplate, Type, AlertCircle } from 'lucide-react';
import { apiErrorMessage } from '@/features/documents/api/laravelApi';

export default function AddElementModal() {
  const { id: documentId } = useParams<{ id: string }>();
  const { addElementModalOpen, addElementParentId, addElementType, addElementSortOrder, setAddElementModal } = useViewerStore();
  const { createNode, createArticle } = useDocumentMutations(documentId || '');

  const [type, setType] = React.useState<'NODE' | 'ARTICLE'>('NODE');
  const [nodeType, setNodeType] = React.useState('TITRE');
  const [numero, setNumero] = React.useState('');
  const [titre, setTitre] = React.useState('');
  const [content, setContent] = React.useState('');

  const resetForm = React.useCallback(() => {
    setNumero('');
    setTitre('');
    setContent('');
    setType('NODE');
    setNodeType('TITRE');
  }, []);

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
    <Dialog
      open={addElementModalOpen}
      onOpenChange={(open) => {
        if (open) resetForm();
        setAddElementModal(open);
      }}
    >
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

          {(createArticle.isError || createNode.isError) && (
            <p className="text-red text-[10.5px] font-mono bg-red-d border border-red/20 rounded px-2.5 py-2 flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 shrink-0 mt-px" />
              <span>{apiErrorMessage(createArticle.error ?? createNode.error, "Échec de l'ajout. Vérifiez le numéro et le contenu.")}</span>
            </p>
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

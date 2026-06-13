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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { Edit2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

/** Statuts acceptés par l'API (PATCH /articles/{id}). */
const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente', icon: Clock, className: 'text-amber' },
  { value: 'validated', label: 'Validé', icon: CheckCircle2, className: 'text-green' },
  { value: 'error', label: 'Erreur', icon: AlertCircle, className: 'text-red' },
  { value: 'draft', label: 'Brouillon', icon: Edit2, className: 'text-t3' },
] as const;

/** Convertit le code UI (vs) vers la valeur API. */
function vsToApiStatus(vs?: string | null): string {
  switch (vs) {
    case 'ok': return 'validated';
    case 'err': return 'error';
    case 'pend': return 'pending';
    default: return vs || 'pending';
  }
}

export default function RenameNodeModal() {
  const { id: documentId } = useParams<{ id: string }>();
  const { renameModalOpen, renameNode, setRenameModal } = useViewerStore();
  const { updateNode, updateArticle } = useDocumentMutations(documentId || '');

  const [numero, setNumero] = React.useState('');
  const [titre, setTitre] = React.useState('');
  const [content, setContent] = React.useState('');
  const [status, setStatus] = React.useState('pending');

  const isArticle = renameNode?.type === 'ARTICLE';

  React.useEffect(() => {
    if (renameModalOpen && renameNode) {
      setNumero(renameNode.numero || '');
      setTitre(renameNode.label || '');
      setContent(renameNode.content || '');
      setStatus(vsToApiStatus(renameNode.vs));
    }
  }, [renameModalOpen, renameNode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameNode) return;

    if (renameNode.type === 'ARTICLE') {
      updateArticle.mutate({
        id: renameNode.id,
        numero_article: numero,
        content,
        validation_status: status,
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
      <DialogContent className={isArticle ? 'sm:max-w-[560px]' : 'sm:max-w-[425px]'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            {isArticle ? `Modifier l'article ${renameNode.numero || ''}` : 'Modifier l\'élément'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-4">
            <div className={isArticle ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}>
              <div className="space-y-2">
                <Label>{isArticle ? 'Numéro de l\'article' : 'Numéro / Préfixe'}</Label>
                <Input
                  placeholder="Ex: 123-1, LIVRE I..."
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </div>

              {isArticle && (
                <div className="space-y-2">
                  <Label>Statut de validation</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <opt.icon className={`w-3.5 h-3.5 ${opt.className}`} />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {!isArticle && (
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

            {isArticle && (
              <div className="space-y-2">
                <Label>Contenu (texte en vigueur)</Label>
                <textarea
                  className="w-full bg-s2 border border-b1 rounded-md text-t1 text-[12px] font-serif p-2.5 leading-[1.7] resize-y outline-none min-h-[180px] transition-colors focus:border-b3"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Texte de l'article..."
                />
                <p className="text-[10px] text-t3 leading-relaxed">
                  Si le texte change, une nouvelle version datée d'aujourd'hui est créée
                  automatiquement (l'historique reste consultable dans l'onglet Versions).
                </p>
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

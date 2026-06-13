import React from 'react';
import { useParams } from 'react-router-dom';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';
import type { LegalDocument } from '@/shared/types/database';
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
import { FilePen } from 'lucide-react';

const STATUTS = [
  { value: 'vigueur', label: 'En vigueur' },
  { value: 'abroge', label: 'Abrogé' },
  { value: 'projet', label: 'Projet' },
] as const;

const SCOPES = [
  { value: 'national', label: 'National' },
  { value: 'ohada', label: 'OHADA' },
  { value: 'communautaire', label: 'Communautaire' },
] as const;

/**
 * Édition des métadonnées du document (PATCH /legal-documents/{id}) :
 * titre officiel, référence NOR, statut juridique, périmètre et dates clés.
 */
export default function EditDocumentModal({ document }: { document?: LegalDocument }) {
  const { id: documentId } = useParams<{ id: string }>();
  const { editDocModalOpen, setEditDocModalOpen } = useViewerStore();
  const { updateDocument } = useDocumentMutations(documentId || '');

  const [titre, setTitre] = React.useState('');
  const [nor, setNor] = React.useState('');
  const [statut, setStatut] = React.useState<string>('vigueur');
  const [scope, setScope] = React.useState<string>('national');
  const [dateSignature, setDateSignature] = React.useState('');
  const [datePublication, setDatePublication] = React.useState('');
  const [dateVigueur, setDateVigueur] = React.useState('');

  React.useEffect(() => {
    if (editDocModalOpen && document) {
      setTitre(document.titre_officiel || document.title || '');
      setNor(document.reference_nor || '');
      setStatut(document.statut || 'vigueur');
      setScope(document.legal_scope || 'national');
      setDateSignature(document.date_signature?.slice(0, 10) || '');
      setDatePublication(document.date_publication?.slice(0, 10) || '');
      setDateVigueur((document as { date_entree_vigueur?: string | null }).date_entree_vigueur?.slice(0, 10) || '');
    }
  }, [editDocModalOpen, document]);

  if (!document) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDocument.mutate({
      titre_officiel: titre.trim(),
      reference_nor: nor.trim() || null,
      statut: statut as 'vigueur' | 'abroge' | 'projet',
      legal_scope: scope as 'national' | 'ohada' | 'communautaire',
      date_signature: dateSignature || null,
      date_publication: datePublication || null,
      date_entree_vigueur: dateVigueur || null,
    }, {
      onSuccess: () => setEditDocModalOpen(false)
    });
  };

  return (
    <Dialog open={editDocModalOpen} onOpenChange={setEditDocModalOpen}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePen className="w-5 h-5" />
            Modifier le document
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Titre officiel</Label>
            <Input
              placeholder="Ex: Code du travail"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Référence NOR</Label>
              <Input
                placeholder="Ex: NOR-2026-001"
                value={nor}
                onChange={(e) => setNor(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Statut juridique</Label>
              <Select value={statut} onValueChange={setStatut}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  {STATUTS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Périmètre juridique</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger>
                  <SelectValue placeholder="Périmètre" />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date de signature</Label>
              <Input
                type="date"
                value={dateSignature}
                onChange={(e) => setDateSignature(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date de publication</Label>
              <Input
                type="date"
                value={datePublication}
                onChange={(e) => setDatePublication(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Entrée en vigueur</Label>
              <Input
                type="date"
                value={dateVigueur}
                onChange={(e) => setDateVigueur(e.target.value)}
              />
            </div>
          </div>

          {updateDocument.isError && (
            <p className="text-red text-[11px] font-mono">
              La mise à jour a échoué. Vérifiez les champs puis réessayez.
            </p>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setEditDocModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="gold" disabled={updateDocument.isPending || !titre.trim()}>
              {updateDocument.isPending ? 'Enregistrement...' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

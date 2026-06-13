import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useJournalMutations } from '@/features/journals/hooks/useJournals';
import { getDocumentTypes } from '@/features/documents/api/laravelApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { FilePlus2 } from 'lucide-react';

interface DocumentType {
  code: string;
  nom?: string;
  name?: string;
}

/**
 * Ajout manuel d'un texte que l'extraction a manqué dans ce journal :
 * crée un acte de FLUX rattaché au JO puis ouvre le viewer pour la
 * structuration manuelle (articles, nœuds).
 */
export default function AddMissingTextModal({
  journalId,
  open,
  onOpenChange,
}: {
  journalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { createMissingText } = useJournalMutations(journalId);

  const { data: typesData } = useQuery({
    queryKey: ['document-types'],
    queryFn: () => getDocumentTypes() as Promise<{ data?: DocumentType[] }>,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const types: DocumentType[] = Array.isArray(typesData) ? typesData : (typesData?.data ?? []);

  const [titre, setTitre] = React.useState('');
  const [typeCode, setTypeCode] = React.useState('');
  const [dateSignature, setDateSignature] = React.useState('');
  const [datePublication, setDatePublication] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setTitre('');
      setTypeCode('');
      setDateSignature('');
      setDatePublication('');
      createMissingText.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMissingText.mutate({
      titre_officiel: titre.trim(),
      type_code: typeCode || null,
      date_signature: dateSignature || null,
      date_publication: datePublication || null,
    }, {
      onSuccess: (response) => {
        onOpenChange(false);
        const newId = response?.data?.id;
        if (newId) {
          // Direction le viewer pour structurer le texte (nœuds + articles).
          navigate(`/editor/viewer/${newId}`);
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-gold" />
            Ajouter un texte manquant
          </DialogTitle>
          <DialogDescription>
            Pour les actes que l'extraction automatique a manqués : le texte est
            créé en brouillon, rattaché à ce journal, puis s'ouvre dans le viewer
            pour la saisie manuelle de sa structure et de ses articles.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Titre officiel</Label>
            <Input
              placeholder="Ex: Décret n° 2026-101 du 5 mai 2026 portant..."
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeCode} onValueChange={setTypeCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map(t => (
                    <SelectItem key={t.code} value={t.code}>{t.nom || t.name || t.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Signature</Label>
              <Input
                type="date"
                value={dateSignature}
                onChange={(e) => setDateSignature(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Publication</Label>
              <Input
                type="date"
                value={datePublication}
                onChange={(e) => setDatePublication(e.target.value)}
              />
            </div>
          </div>

          {createMissingText.isError && (
            <p className="text-red text-[11px] font-mono">
              La création a échoué. Vérifiez les champs puis réessayez.
            </p>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="gold" disabled={createMissingText.isPending || !titre.trim()}>
              {createMissingText.isPending ? 'Création...' : 'Créer et structurer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

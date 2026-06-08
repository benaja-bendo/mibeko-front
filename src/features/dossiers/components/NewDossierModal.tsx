/**
 * NewDossierModal.tsx — Création d'un dossier (affaire).
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { useDossiersStore } from '@/features/dossiers/store/useDossiersStore';
import type { DossierInput } from '@/features/dossiers/types';

interface NewDossierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Notifie l'id du dossier créé (pour l'ouvrir aussitôt). */
  onCreated?: (id: string) => void;
}

const EMPTY: DossierInput = {
  title: '',
  reference: '',
  client: '',
  adverse: '',
  jurisdiction: '',
  description: '',
};

export default function NewDossierModal({
  open,
  onOpenChange,
  onCreated,
}: NewDossierModalProps) {
  const createDossier = useDossiersStore((s) => s.createDossier);
  const [form, setForm] = useState<DossierInput>(EMPTY);

  const set = (key: keyof DossierInput, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    if (!form.title.trim()) return;
    const id = createDossier(form);
    setForm(EMPTY);
    onOpenChange(false);
    onCreated?.(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau dossier</DialogTitle>
          <DialogDescription>
            Créez une affaire pour organiser vos références, pièces et documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Intitulé du dossier *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ex. Licenciement abusif — M. Kabongo"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reference">Référence interne</Label>
              <Input
                id="reference"
                value={form.reference}
                onChange={(e) => set('reference', e.target.value)}
                placeholder="2026-0142"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                value={form.client}
                onChange={(e) => set('client', e.target.value)}
                placeholder="Nom du client"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="adverse">Partie adverse</Label>
              <Input
                id="adverse"
                value={form.adverse}
                onChange={(e) => set('adverse', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jurisdiction">Juridiction</Label>
              <Input
                id="jurisdiction"
                value={form.jurisdiction}
                onChange={(e) => set('jurisdiction', e.target.value)}
                placeholder="Tribunal de…"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Objet et enjeux du dossier…"
              className="w-full resize-none rounded-md border border-b1 bg-s2 px-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="gold" onClick={submit} disabled={!form.title.trim()}>
            Créer le dossier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

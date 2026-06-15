/**
 * NewDossierModal.tsx — Création d'un dossier (affaire) en 3 temps.
 *
 * 1) choix du type (contentieux/conseil) → 2) champs adaptés au type →
 * 3) échéances suggérées (cochables). Le type choisi pilote les champs affichés
 * et les préréglages d'échéances créés avec le dossier.
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { useCreateDossier } from '@/features/dossiers/hooks/useDossiers';
import {
  DOSSIER_TYPE_OPTIONS,
  ECHEANCE_PRESETS,
} from '@/features/dossiers/presets';
import type {
  ClientRole,
  CreateDossierInput,
  DossierType,
} from '@/features/dossiers/types';

interface NewDossierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Notifie l'id du dossier créé (pour l'ouvrir aussitôt). */
  onCreated?: (id: string) => void;
}

const EMPTY_FORM = {
  title: '',
  reference: '',
  client: '',
  clientRole: '',
  adverse: '',
  jurisdiction: '',
  nature: '',
  matiere: '',
  description: '',
};

const SectionLabel = ({ step, children }: { step: number; children: React.ReactNode }) => (
  <p className="text-xs text-t3">
    <span className="font-mono">{step}</span> · {children}
  </p>
);

export default function NewDossierModal({
  open,
  onOpenChange,
  onCreated,
}: NewDossierModalProps) {
  const create = useCreateDossier();
  const [type, setType] = useState<DossierType>('contentieux');
  const [form, setForm] = useState(EMPTY_FORM);
  const [checked, setChecked] = useState<boolean[]>(() =>
    ECHEANCE_PRESETS.contentieux.map((p) => p.defaultChecked),
  );

  const presets = ECHEANCE_PRESETS[type];

  const set = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const chooseType = (next: DossierType) => {
    setType(next);
    setChecked(ECHEANCE_PRESETS[next].map((p) => p.defaultChecked));
  };

  const reset = () => {
    setType('contentieux');
    setForm(EMPTY_FORM);
    setChecked(ECHEANCE_PRESETS.contentieux.map((p) => p.defaultChecked));
  };

  const submit = async () => {
    if (!form.title.trim() || create.isPending) return;

    const input: CreateDossierInput = {
      type,
      title: form.title.trim(),
      reference: form.reference || undefined,
      client: form.client || undefined,
      matiere: form.matiere || undefined,
      description: form.description || undefined,
      echeances: presets
        .filter((_, i) => checked[i])
        .map((p) => ({ type: p.type, title: p.title })),
      ...(type === 'contentieux'
        ? {
            clientRole: (form.clientRole || undefined) as ClientRole | undefined,
            adverse: form.adverse || undefined,
            jurisdiction: form.jurisdiction || undefined,
          }
        : { nature: form.nature || undefined }),
    };

    const record = await create.mutateAsync(input);
    reset();
    onOpenChange(false);
    onCreated?.(record.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau dossier</DialogTitle>
          <DialogDescription>
            Les champs et les échéances s'adaptent au type choisi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* 1 · Type */}
          <div className="space-y-2">
            <SectionLabel step={1}>Type de dossier</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {DOSSIER_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => chooseType(opt.value)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? 'border-gold bg-gold/[0.06]'
                        : 'border-b1 hover:border-b2'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${active ? 'text-gold' : 'text-t3'}`}
                    />
                    <p className="mt-1.5 text-sm font-medium text-t1">
                      {opt.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-t3">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2 · Informations */}
          <div className="space-y-3">
            <SectionLabel step={2}>Informations</SectionLabel>

            <div className="space-y-1.5">
              <Label htmlFor="title">
                {type === 'contentieux' ? 'Objet du litige' : 'Intitulé du dossier'} *
              </Label>
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

            {type === 'contentieux' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="clientRole">Qualité du client</Label>
                    <select
                      id="clientRole"
                      value={form.clientRole}
                      onChange={(e) => set('clientRole', e.target.value)}
                      className="h-9 w-full rounded-md border border-b1 bg-s2 px-2 text-sm text-t1 focus:outline-none focus:ring-1 focus:ring-gold"
                    >
                      <option value="">—</option>
                      <option value="demandeur">Demandeur</option>
                      <option value="defendeur">Défendeur</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="adverse">Partie adverse</Label>
                    <Input
                      id="adverse"
                      value={form.adverse}
                      onChange={(e) => set('adverse', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="jurisdiction">Juridiction</Label>
                    <Input
                      id="jurisdiction"
                      value={form.jurisdiction}
                      onChange={(e) => set('jurisdiction', e.target.value)}
                      placeholder="Tribunal de…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="matiere">Matière</Label>
                    <Input
                      id="matiere"
                      value={form.matiere}
                      onChange={(e) => set('matiere', e.target.value)}
                      placeholder="Droit du travail…"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nature">Nature du dossier</Label>
                  <Input
                    id="nature"
                    value={form.nature}
                    onChange={(e) => set('nature', e.target.value)}
                    placeholder="Constitution de société…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="matiere">Matière</Label>
                  <Input
                    id="matiere"
                    value={form.matiere}
                    onChange={(e) => set('matiere', e.target.value)}
                    placeholder="Commercial / OHADA…"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                placeholder="Objet et enjeux du dossier…"
                className="w-full resize-none rounded-md border border-b1 bg-s2 px-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>
          </div>

          {/* 3 · Échéances suggérées */}
          <div className="space-y-2">
            <SectionLabel step={3}>Échéances suggérées — cochez ce que vous gardez</SectionLabel>
            <div className="overflow-hidden rounded-lg border border-b1">
              {presets.map((preset, i) => (
                <label
                  key={`${preset.type}-${preset.title}`}
                  className="flex cursor-pointer items-center gap-2.5 border-b border-b1 px-3 py-2 last:border-0 hover:bg-s1"
                >
                  <input
                    type="checkbox"
                    checked={checked[i] ?? false}
                    onChange={(e) =>
                      setChecked((prev) =>
                        prev.map((v, j) => (j === i ? e.target.checked : v)),
                      )
                    }
                    className="h-4 w-4 accent-gold"
                  />
                  <span className="text-sm text-t1">{preset.title}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-t3">
              Les dates se renseignent ensuite dans le dossier.
            </p>
          </div>

          {create.isError && (
            <p className="rounded-md bg-red-d px-3 py-2 text-[11px] text-red">
              {create.error instanceof Error
                ? create.error.message
                : 'La création a échoué.'}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="gold"
            onClick={submit}
            disabled={!form.title.trim() || create.isPending}
          >
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer le dossier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

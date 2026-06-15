/**
 * presets.ts — Métadonnées des types de dossier et échéances pré-suggérées.
 *
 * Couche purement front : le type choisi à la création pilote (a) les champs
 * affichés et (b) la liste d'échéances proposées (cochables). Les libellés
 * d'échéances ne portent pas de durée — les dates se renseignent ensuite à la
 * main ou via le calculateur de délais (Palier 2).
 */

import { Briefcase, Gavel, type LucideIcon } from 'lucide-react';
import type { DossierType, EcheanceType } from '@/features/dossiers/types';

export interface DossierTypeOption {
  value: DossierType;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const DOSSIER_TYPE_OPTIONS: DossierTypeOption[] = [
  {
    value: 'contentieux',
    label: 'Contentieux',
    description:
      'Litige porté devant une juridiction : partie adverse, audiences, délais de recours.',
    icon: Gavel,
  },
  {
    value: 'conseil',
    label: 'Conseil',
    description:
      'Hors litige : constitution de société, contrat, consultation, due diligence.',
    icon: Briefcase,
  },
];

export interface EcheancePreset {
  type: EcheanceType;
  title: string;
  /** Pré-cochée dans le formulaire de création. */
  defaultChecked: boolean;
}

export const ECHEANCE_PRESETS: Record<DossierType, EcheancePreset[]> = {
  contentieux: [
    { type: 'audience', title: 'Audience', defaultChecked: true },
    { type: 'delai_procedure', title: "Délai d'appel", defaultChecked: true },
    { type: 'interne', title: 'Remise des conclusions', defaultChecked: false },
    { type: 'prescription', title: "Prescription de l'action", defaultChecked: false },
  ],
  conseil: [
    { type: 'formalite', title: 'Dépôt RCCM', defaultChecked: true },
    { type: 'formalite', title: 'Publication / formalités', defaultChecked: false },
    { type: 'interne', title: 'Remise du livrable au client', defaultChecked: true },
  ],
};

/**
 * types.ts — Modèle de données de la gestion des Dossiers.
 *
 * Le dossier « affaire » (cœur + échéances) est désormais persisté côté Laravel
 * (`/dossiers` CRUD web). Les références juridiques, pièces et documents générés
 * restent locaux (store d'annexes) en attendant leur passage serveur. Le type
 * `Dossier` est la vue fusionnée (enregistrement serveur + annexes locales).
 */

/** Statuts d'avancement d'une affaire (colonnes du Kanban). */
export type DossierStatus = 'ouvert' | 'en_cours' | 'en_attente' | 'clos';

/** Type de dossier (formulaire de création adaptatif). */
export type DossierType = 'contentieux' | 'conseil';

/** Qualité du client dans un contentieux. */
export type ClientRole = 'demandeur' | 'defendeur';

/** Catégorie d'échéance. */
export type EcheanceType =
  | 'audience'
  | 'delai_procedure'
  | 'prescription'
  | 'formalite'
  | 'interne'
  | 'autre';

/** Cycle de vie d'une échéance. */
export type EcheanceStatus = 'a_venir' | 'fait' | 'reporte' | 'manque';

/** Référence juridique rattachée (article ou document de la Bibliothèque). */
export interface LegalReference {
  /** UUID de l'article/document côté base juridique. */
  id: string;
  type: 'article' | 'document';
  title: string;
  breadcrumb?: string;
  number?: string | null;
  note?: string;
}

/** Pièce versée au dossier (métadonnées du fichier). */
export interface Piece {
  id: string;
  name: string;
  size: number;
  mime: string;
  note?: string;
  addedAt: string;
}

/** Document généré depuis un modèle (mise en demeure, statuts…). */
export interface GeneratedDocument {
  id: string;
  templateId: string;
  templateName: string;
  title: string;
  /** Contenu HTML imprimable. */
  html: string;
  createdAt: string;
}

/** Échéance d'un dossier (audience, délai, prescription…). */
export interface Echeance {
  id: string;
  dossierId: string;
  type: EcheanceType;
  title: string;
  /** Date d'échéance au format ISO court (YYYY-MM-DD) ou null si non datée. */
  dueDate: string | null;
  status: EcheanceStatus;
  triggerEvent?: string | null;
  triggerDate?: string | null;
  ruleId?: string | null;
  basisArticleId?: string | null;
  isConfirmed: boolean;
  reminders: number[];
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Enregistrement « affaire » tel que persisté par l'API web. */
export interface DossierRecord {
  id: string;
  type: DossierType;
  title: string;
  /** Référence interne du cabinet (ex. "2026-0142"). */
  reference?: string;
  client?: string;
  clientRole?: ClientRole;
  /** Partie adverse (contentieux). */
  adverse?: string;
  /** Juridiction compétente (contentieux). */
  jurisdiction?: string;
  /** Nature du dossier (conseil). */
  nature?: string;
  /** Matière / domaine juridique. */
  matiere?: string;
  status: DossierStatus;
  description?: string;
  color?: string;
  echeances: Echeance[];
  createdAt: string;
  updatedAt: string;
}

/** Vue complète d'un dossier : enregistrement serveur + annexes locales. */
export interface Dossier extends DossierRecord {
  references: LegalReference[];
  pieces: Piece[];
  documents: GeneratedDocument[];
}

/** Saisie d'une échéance (création ou préréglage). */
export interface EcheanceInput {
  type: EcheanceType;
  title: string;
  dueDate?: string | null;
  status?: EcheanceStatus;
  reminders?: number[];
  note?: string | null;
  triggerEvent?: string | null;
  triggerDate?: string | null;
}

/** Données de création d'un dossier. */
export interface CreateDossierInput {
  type: DossierType;
  title: string;
  reference?: string;
  client?: string;
  clientRole?: ClientRole;
  adverse?: string;
  jurisdiction?: string;
  nature?: string;
  matiere?: string;
  description?: string;
  /** Échéances initiales (étape « échéances suggérées »). */
  echeances?: EcheanceInput[];
}

/** Mise à jour partielle d'un dossier. */
export type UpdateDossierInput = Partial<
  Omit<CreateDossierInput, 'echeances'>
> & { status?: DossierStatus };

export const STATUS_META: Record<
  DossierStatus,
  { label: string; color: string; dot: string }
> = {
  ouvert: { label: 'Ouvert', color: 'text-blue', dot: 'bg-blue' },
  en_cours: { label: 'En cours', color: 'text-gold', dot: 'bg-gold' },
  en_attente: { label: 'En attente', color: 'text-amber', dot: 'bg-amber' },
  clos: { label: 'Clos', color: 'text-green', dot: 'bg-green' },
};

export const STATUS_ORDER: DossierStatus[] = [
  'ouvert',
  'en_cours',
  'en_attente',
  'clos',
];

export const ECHEANCE_STATUS_META: Record<
  EcheanceStatus,
  { label: string; color: string; dot: string }
> = {
  a_venir: { label: 'À venir', color: 'text-t2', dot: 'bg-t3' },
  fait: { label: 'Fait', color: 'text-green', dot: 'bg-green' },
  reporte: { label: 'Reporté', color: 'text-amber', dot: 'bg-amber' },
  manque: { label: 'Manqué', color: 'text-red', dot: 'bg-red' },
};

export const ECHEANCE_TYPE_META: Record<EcheanceType, { label: string }> = {
  audience: { label: 'Audience' },
  delai_procedure: { label: 'Délai de procédure' },
  prescription: { label: 'Prescription' },
  formalite: { label: 'Formalité' },
  interne: { label: 'Interne' },
  autre: { label: 'Autre' },
};

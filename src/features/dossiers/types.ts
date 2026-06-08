/**
 * types.ts — Modèle de données de la gestion des Dossiers.
 *
 * Le backend Laravel n'expose pour l'instant que l'export PDF
 * (`POST /dossiers/export-pdf`) ; le CRUD des dossiers est géré côté client
 * (persistance locale) en attendant les endpoints dédiés. Le modèle est
 * volontairement aligné sur ce que produira l'API pour faciliter la bascule.
 */

/** Statuts d'avancement d'une affaire (colonnes du Kanban). */
export type DossierStatus = 'ouvert' | 'en_cours' | 'en_attente' | 'clos';

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

/** Affaire / dossier juridique. */
export interface Dossier {
  id: string;
  title: string;
  /** Référence interne du cabinet (ex. "2026-0142"). */
  reference?: string;
  client?: string;
  /** Partie adverse. */
  adverse?: string;
  /** Juridiction compétente. */
  jurisdiction?: string;
  status: DossierStatus;
  description?: string;
  references: LegalReference[];
  pieces: Piece[];
  documents: GeneratedDocument[];
  createdAt: string;
  updatedAt: string;
}

/** Données de création d'un dossier (sous-ensemble éditable). */
export type DossierInput = Pick<
  Dossier,
  'title' | 'reference' | 'client' | 'adverse' | 'jurisdiction' | 'description'
>;

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

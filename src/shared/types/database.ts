import type { ApiTable } from '@/shared/lib/tables';

export interface LegalDocument {
  id: string;
  type_code?: string | null;
  type?: { code: string; name?: string; nom?: string } | null;
  titre_officiel?: string;
  title?: string;
  /**
   * Objet de l'acte DÉRIVÉ de son corps, pour les intitulés que le Journal
   * officiel réduit au type, au numéro et à la date (« actes en abrégé » :
   * « Décret n° 2025-240 du 20 juin 2025. »). Ces intitulés sont fidèles à la
   * source, il n'y a rien à y corriger — c'est le JO qui n'imprime aucun objet.
   *
   * À AFFICHER À CÔTÉ DU TITRE OFFICIEL, JAMAIS À SA PLACE : utiliser
   * `documentLineLabel()` (shared/lib/legalLabels) plutôt que de choisir l'un
   * des deux.
   */
  libelle_descriptif?: string | null;
  /** `article` = tiré du premier article puis relu ; `manuel` = écrit par un juriste. */
  libelle_descriptif_source?: 'article' | 'manuel' | null;
  reference_nor?: string | null;
  reference?: string | null;
  date_signature?: string | null;
  date_publication?: string | null;
  date_entree_vigueur?: string | null;
  /** Absence de date d'entrée en vigueur explicitement assumée (gate de publication). */
  date_entree_vigueur_inconnue?: boolean | null;
  dates?: { signature: string | null; publication: string | null };
  statut?: 'vigueur' | 'abroge' | 'projet';
  /**
   * Vrai si un éditeur a réellement établi `statut`. La colonne vaut
   * « vigueur » par défaut en base : sans cette confirmation elle répète le
   * défaut au lieu d'affirmer quoi que ce soit. Mesuré le 10/08/2026 : les 795
   * documents publiés étaient dans ce cas.
   */
  statut_verifie?: boolean;
  statut_verifie_le?: string | null;
  status?: string;
  curation_status?: string | null;
  legal_scope?: 'national' | 'ohada' | 'communautaire' | null;
  official_journal_id?: string | null;
  official_journal?: {
    id: string;
    title?: string | null;
    publication_date?: string | null;
  } | null;
  themes?: DocumentTheme[];
}

export interface DocumentTheme {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

export interface StructureNode {
  id: string;
  document_id: string;
  type_unite: string; // 'TITRE', 'LIVRE', 'CHAPITRE', 'SECTION', etc.
  numero: string | null;
  titre: string | null;
  tree_path: string;
  validation_status: string;
  sort_order: number;
}

export interface Article {
  id: string;
  document_id: string;
  parent_node_id: string | null;
  numero_article: string;
  ordre_affichage: number;
  validation_status: string;
}

export interface ArticleVersion {
  id: string;
  article_id: string;
  validity_period: string;
  contenu_texte: string;
  validation_status: string;
  is_verified: boolean;
  created_at: string;
}

export interface DocumentRelation {
  id: string;
  source_doc_id?: string | null;
  target_doc_id?: string | null;
  source_article_id?: string | null;
  target_article_id?: string | null;
  relation_type: string;
  commentaire?: string | null;
  effective_date?: string | null;
  confidence?: number | null;
  meta?: Record<string, unknown> | null;
}

// Hierarchical types for the UI (Tree)
export interface TreeNode {
  id: string;
  parent_id?: string | null;
  type: string;
  numero: string | null;
  label: string | null;
  sort_order: number;
  vs: 'ok' | 'err' | 'pend'; // Simplified validation status
  children?: TreeNode[];
  
  // Specific to articles
  validity?: string;
  content?: string;
  source_locator?: ArticleSourceLocator | null;
  versions?: ArticleVersionUI[];
  relations?: DocumentRelation[];
}

/**
 * Ancrage d'une version d'article dans son PDF source, enrichi par l'ingestion.
 *
 * `content_format` et `tables` disent ce que le texte ne peut pas dire de
 * lui-même : la nature de la feuille et la structure de ses tableaux — sans
 * quoi une surface de lecture ne peut rendre qu'un mur de texte.
 */
export interface ArticleSourceLocator {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Feuille spéciale posée à l'ingestion : `preamble`, `signature`, `table`. */
  content_format?: string | null;
  /** Tableaux structurés de l'article (cf. `shared/lib/tables.ts`). */
  tables?: ApiTable[] | null;
}

export interface ArticleVersionUI {
  id: string;
  date: string;
  created_at: string;
  type: 'creation' | 'modification' | 'pending';
  title: string;
  author: string;
  contenu_texte: string;
  prev?: string;
  pending?: boolean;
}

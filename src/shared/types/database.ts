export interface LegalDocument {
  id: string;
  type_code?: string | null;
  type?: { code: string; name?: string; nom?: string } | null;
  titre_officiel?: string;
  title?: string;
  reference_nor?: string | null;
  reference?: string | null;
  date_signature?: string | null;
  date_publication?: string | null;
  date_entree_vigueur?: string | null;
  /** Absence de date d'entrée en vigueur explicitement assumée (gate de publication). */
  date_entree_vigueur_inconnue?: boolean | null;
  dates?: { signature: string | null; publication: string | null };
  statut?: 'vigueur' | 'abroge' | 'projet';
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
  source_locator?: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  versions?: ArticleVersionUI[];
  relations?: DocumentRelation[];
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

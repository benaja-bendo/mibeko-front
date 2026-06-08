/**
 * types.ts — Contrats de la Bibliothèque Juridique.
 *
 * La recherche s'appuie sur l'endpoint Laravel `/search` (hybride : vectoriel
 * pgvector + plein-texte), avec génération optionnelle d'une réponse RAG.
 */

/** Un résultat de recherche (granularité article). */
export interface SearchResultItem {
  id: string;
  number?: string | null;
  order?: number;
  content?: string | null;
  document_id?: string | null;
  document_title?: string | null;
  document_type?: string | null;
  node_title?: string | null;
  breadcrumb?: string | null;
  validation_status?: string | null;
  score?: number | null;
}

/** Réponse de recherche normalisée (gère les deux formes du backend). */
export interface LibrarySearchResult {
  /** Réponse synthétique de l'IA si le mode RAG est actif (sinon null). */
  answer: string | null;
  results: SearchResultItem[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  } | null;
}

/** Type de document (filtre latéral). */
export interface DocumentTypeOption {
  code: string;
  name: string;
  hierarchy_level?: number;
}

/** Périmètre juridique — filtre client (le modèle n'a pas de champ "pays"). */
export type LegalScope = 'all' | 'congo' | 'ohada';

/** État des filtres de la Bibliothèque. */
export interface LibraryFilterState {
  /** Code du type de document (CODE, LOI, DECRET…). */
  typeCode: string | null;
  scope: LegalScope;
  /** Active la génération d'une réponse de synthèse (RAG). */
  rag: boolean;
}

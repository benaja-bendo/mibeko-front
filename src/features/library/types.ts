/**
 * types.ts — Contrats de la Bibliothèque Juridique.
 *
 * La recherche s'appuie sur l'endpoint Laravel `/search` (hybride : vectoriel
 * pgvector + plein-texte), avec filtres serveur (type, institution, périmètre,
 * dates, tri) et génération optionnelle d'une réponse RAG.
 */

/** Périmètre juridique — champ serveur réel (`legal_documents.legal_scope`). */
export type LegalScope = 'all' | 'national' | 'ohada' | 'communautaire';

/** Mode de recherche : sémantique (avec synthèse IA) ou précise (texte exact). */
export type SearchMode = 'semantic' | 'precise';

/** Tri des résultats. */
export type SearchSort = 'relevance' | 'date_desc' | 'date_asc';

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
  legal_scope?: LegalScope | null;
  institution_id?: string | null;
  institution?: string | null;
  date_publication?: string | null;
  validation_status?: string | null;
  score?: number | null;
}

/** Métadonnées de pagination renvoyées par le backend. */
export interface SearchPagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

/** Réponse de recherche normalisée (gère les deux formes du backend). */
export interface LibrarySearchResult {
  /** Réponse synthétique de l'IA si le mode sémantique est actif (sinon null). */
  answer: string | null;
  results: SearchResultItem[];
  pagination: SearchPagination | null;
}

/** Type de document (filtre latéral). */
export interface DocumentTypeOption {
  code: string;
  name: string;
  hierarchy_level?: number;
}

/** Institution (filtre latéral). */
export interface InstitutionOption {
  id: string;
  name: string;
  acronym?: string | null;
}

/** État des filtres de la Bibliothèque (tous appliqués côté serveur). */
export interface LibraryFilterState {
  mode: SearchMode;
  typeCode: string | null;
  legalScope: LegalScope;
  institutionId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  sort: SearchSort;
}

/** Libellés d'affichage des périmètres. */
export const SCOPE_LABELS: Record<Exclude<LegalScope, 'all'>, string> = {
  national: 'Droit congolais',
  ohada: 'OHADA',
  communautaire: 'Communautaire',
};

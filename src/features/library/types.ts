/**
 * types.ts — Contrats de la Bibliothèque Juridique.
 *
 * La recherche s'appuie sur l'endpoint Laravel `/search` (hybride : vectoriel
 * pgvector + plein-texte), avec filtres serveur (type, institution, périmètre,
 * dates, tri) et génération optionnelle d'une réponse RAG.
 */

/** Périmètre juridique — champ serveur réel (`legal_documents.legal_scope`). */
export type LegalScope = 'all' | 'national' | 'ohada' | 'communautaire';

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

/**
 * Réponse de recherche : liste paginée d'articles, classés par pertinence.
 * La recherche est un moteur 100 % PostgreSQL — elle ne renvoie JAMAIS de
 * synthèse IA (celle-ci est une action volontaire, cf. {@link LibraryAiRequest}).
 */
export interface LibrarySearchResult {
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
  typeCode: string | null;
  legalScope: LegalScope;
  institutionId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  sort: SearchSort;
}

/** Document mis en avant sur l'accueil de la Bibliothèque. */
export interface LibraryHomeDocument {
  id: string;
  title: string;
  type_code?: string | null;
  type_name?: string | null;
  legal_scope?: LegalScope | null;
  date_publication?: string | null;
  articles_count?: number;
}

/** Données de l'accueil de la Bibliothèque (`GET /library/home`). */
export interface LibraryHomeData {
  stats: {
    documents: number;
    articles: number;
    institutions: number;
  };
  essential_documents: LibraryHomeDocument[];
  recent_documents: LibraryHomeDocument[];
  suggestions: string[];
}

/**
 * Requête vers la couche IA « à la demande » de la Bibliothèque, rendue dans
 * le panneau droit. Deux natures :
 *  - `explain`   : expliquer UN article précis ;
 *  - `synthesis` : synthétiser le top-K d'une recherche (mêmes filtres serveur).
 */
export type LibraryAiRequest =
  | {
      kind: 'explain';
      articleId: string;
      /** Titre du document (affichage de l'en-tête du panneau). */
      documentTitle: string;
      articleNumber?: string | null;
    }
  | {
      kind: 'synthesis';
      q: string;
      filters: LibraryFilterState;
    };

/**
 * Callbacks branchés sur le flux SSE des endpoints IA de la Bibliothèque
 * (`/library/explain`, `/library/synthesis`). Mêmes événements que l'Assistant.
 */
export interface LibraryAiCallbacks {
  /** Statut intermédiaire éventuel. */
  onStatus?: (message: string) => void;
  /** Sources juridiques ayant servi de contexte (émises avant le texte). */
  onSources?: (sources: SearchResultItem[]) => void;
  /** Fragment de texte (effet machine à écrire). */
  onDelta?: (delta: string) => void;
  /** Erreur de génération côté serveur. */
  onError?: (message: string) => void;
  /** Fin du flux (`[DONE]`). */
  onDone?: () => void;
}

/** Libellés d'affichage des périmètres. */
export const SCOPE_LABELS: Record<Exclude<LegalScope, 'all'>, string> = {
  national: 'Droit congolais',
  ohada: 'OHADA',
  communautaire: 'Communautaire',
};

import { laravelClient, laravelBaseUrl as BASE } from '@/shared/api';

/**
 * laravelApi.ts — Client typé pour le backend Laravel 13 (mibeko-tableau-de-bord).
 * Toutes les requêtes passent par le proxy Vite /api/v1 → http://localhost:8000/api/v1
 *
 * Toutes les fonctions s'appuient directement sur `laravelClient` (axios) : jeton
 * Bearer, purge sur 401 et normalisation des messages d'erreur sont assurés par
 * ses intercepteurs (voir `shared/api/laravelClient`).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LaravelDocument {
  id: string;
  // Titre — canonical DB field (Resource retourne aussi `title` comme alias mobile)
  titre_officiel: string;
  title?: string;
  // Référence & classification
  type_code?: string | null;
  type?: { code: string; nom?: string; name?: string } | null;
  reference_nor?: string | null;
  reference?: string | null;
  stock_code?: string | null;
  document_role?: string;
  document_key?: string | null;
  // Statuts
  statut?: 'vigueur' | 'abroge' | 'projet';
  status?: string;
  curation_status?: string | null;
  extraction_status?: string | null;
  // Dates
  date_signature?: string | null;
  date_publication?: string | null;
  date_entree_vigueur?: string | null;
  consolidation_as_of?: string | null;
  // Relations
  institution_id?: string | null;
  official_journal_id?: string | null;
  institution?: { id: string; nom: string; sigle: string } | null;
  // Indicateurs de complétude
  articles_count?: number;
  relations_count?: number;
  tags_count?: number;
  embedded_articles_count?: number;
  embedding_in_progress?: boolean;
  missing_stock_code?: boolean;
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface LaravelTreeNode {
  id: string;
  parent_id?: string | null;
  type: string;
  number?: string | null;
  numero?: string | null;
  title?: string | null;
  titre?: string | null;
  order?: number;
  validation_status?: string;
  articles?: LaravelArticleSummary[];
  children?: LaravelTreeNode[];
}

export interface LaravelArticleSummary {
  id: string;
  numero_article?: string | null;
  number?: string | null;
  validation_status?: string;
  content?: string;
  source_locator?: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  versions?: LaravelArticleVersion[];
  relations?: LaravelRelation[];
}

export interface LaravelArticleVersion {
  id: string;
  article_id: string;
  contenu_texte?: string;
  validity_period?: string;
  validation_status?: string;
  is_verified?: boolean;
  created_at?: string;
}

export interface LaravelRelation {
  id: string;
  source_article_id?: string | null;
  target_article_id?: string | null;
  source_doc_id?: string | null;
  target_doc_id?: string | null;
  relation_type: string;
  commentaire?: string | null;
  effective_date?: string | null;
  confidence?: number | null;
}

export interface CatalogStats {
  total_documents: number;
  total_articles: number;
  recent_documents?: LaravelDocument[];
  // Catalog-specific (from /catalog endpoint)
  global_update_required?: boolean;
  last_essential_sync?: string;
  resources?: LaravelDocument[];
}

export interface CatalogResponse {
  success: boolean;
  message?: string;
  data: LaravelDocument[];
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// Shape of the raw /catalog response (for mobile sync — different structure)
export interface RawCatalogResponse {
  success: boolean;
  message: string;
  data: {
    global_update_required: boolean;
    last_essential_sync: string;
    resources: LaravelDocument[];
  };
}

/**
 * Extrait le message d'erreur lisible renvoyé par l'API Laravel (axios).
 * Préfère `message`, puis la première erreur de validation, sinon un repli.
 */
export function apiErrorMessage(error: unknown, fallback = 'Une erreur est survenue. Réessayez.'): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
    if (data?.message) return data.message;
    const firstError = data?.errors && Object.values(data.errors)[0]?.[0];
    if (firstError) return firstError;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** Liste paginée des documents via /legal-documents (format standard Laravel Resource). */
export interface CatalogFilters {
  search?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  institution_id?: string;
  official_journal_id?: string;
  type_code?: string;
  statut?: string;
  curation_status?: string;
  document_role?: string;
  recent?: number; // derniers N jours
}

export const getCatalog = (params?: CatalogFilters): Promise<CatalogResponse> => {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.per_page) q.set('per_page', String(params.per_page));
  if (params?.sort) q.set('sort', params.sort);
  // Spatie QueryBuilder filter syntax
  if (params?.institution_id) q.set('filter[institution_id]', params.institution_id);
  if (params?.official_journal_id) q.set('filter[official_journal_id]', params.official_journal_id);
  if (params?.type_code) q.set('filter[type_code]', params.type_code);
  if (params?.statut) q.set('filter[statut]', params.statut);
  if (params?.curation_status) q.set('filter[curation_status]', params.curation_status);
  if (params?.document_role) q.set('filter[document_role]', params.document_role);
  if (params?.recent) q.set('filter[recent]', String(params.recent));

  let path = `legal-documents?${q}`;
  if (params?.search) {
    q.set('q', params.search);
    path = `legal-documents/search?${q}`;
  }
  return laravelClient.get<CatalogResponse>(path).then((r) => r.data);
};

export const bulkUpdateDocuments = (payload: {
  ids: string[];
  action: 'set_curation_status' | 'set_statut';
  value: string;
}): Promise<{ data: { updated_count: number }; message: string }> =>
  laravelClient
    .patch<{ data: { updated_count: number }; message: string }>('legal-documents/bulk', payload)
    .then((r) => r.data);

export const bulkDeleteDocuments = (payload: {
  ids: string[];
  force?: boolean;
}): Promise<{ data: { deleted_count: number }; message: string }> =>
  // DELETE avec corps : axios exige de passer la charge via l'option `data`.
  laravelClient
    .delete<{ data: { deleted_count: number }; message: string }>('legal-documents/bulk', { data: payload })
    .then((r) => r.data);

/** Catalogue mobile /catalog — retourne {data:{resources:[...]}} pour sync */
export const getMobileCatalog = (): Promise<RawCatalogResponse> =>
  laravelClient.get<RawCatalogResponse>('catalog').then((r) => r.data);

/** Stats du catalogue. */
export const getCatalogStats = (): Promise<CatalogStats> =>
  laravelClient.get<CatalogStats>('catalog/stats').then((r) => r.data);

/** Détail d'un document. */
export const getDocument = (id: string): Promise<{ data: LaravelDocument }> =>
  laravelClient.get<{ data: LaravelDocument }>(`legal-documents/${id}`).then((r) => r.data);

/** Arbre structurel d'un document. */
export const getDocumentTree = (id: string): Promise<{ data: LaravelTreeNode[] } | LaravelTreeNode[]> =>
  laravelClient
    .get<{ data: LaravelTreeNode[] } | LaravelTreeNode[]>(`legal-documents/${id}/tree`)
    .then((r) => r.data);

/** URL PDF pour un document. */
export const getDocumentPdfUrl = (id: string): string =>
  `${BASE}/legal-documents/${id}/pdf`;

/** URL Export PDF consolidé. */
export const getDocumentExportUrl = (id: string): string =>
  `${BASE}/legal-documents/${id}/export`;

/** URL Export JSON. */
export const getDocumentJsonUrl = (id: string): string =>
  `${BASE}/legal-documents/${id}/download`;

export const downloadFile = async (url: string, filename: string) => {
  const response = await laravelClient.get(url, { responseType: 'blob' });
  const blob = new Blob([response.data]);
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(link.href);
};

export const deleteLegalDocument = (id: string, force?: boolean): Promise<{ success: boolean; message?: string }> =>
  laravelClient
    .delete<{ success: boolean; message?: string }>(`legal-documents/${id}${force ? '?force=1' : ''}`)
    .then((r) => r.data);

/** Détail de ce qu'une suppression définitive emporterait (compteurs + garde-fous). */
export interface DeletionImpact {
  nodes: number;
  articles: number;
  versions: number;
  flags: number;
  media: number;
  relations: number;
  incoming_relations: number;
  dossier_references: number;
}

export const getDeletionImpact = (id: string): Promise<{ data: DeletionImpact }> =>
  laravelClient.get<{ data: DeletionImpact }>(`legal-documents/${id}/deletion-impact`).then((r) => r.data);

/** Anomalie de curation (vue Contrôle). */
export interface CurationFlagDto {
  id: string;
  source: 'heuristic' | 'structural' | 'llm' | 'human';
  type_probleme: string;
  severity: 'blocking' | 'warning' | 'info';
  description: string | null;
  suggestion: { text?: string } | null;
  confidence: number | null;
  resolved: boolean;
  resolved_by: string | null;
  created_at: string | null;
  article_id: string | null;
  node_id: string | null;
  page: number | null;
}

/** Anomalies d'un document, triées (bloquantes d'abord). */
export const getDocumentCurationFlags = (id: string, openOnly = false): Promise<{ data: CurationFlagDto[] }> =>
  laravelClient
    .get<{ data: CurationFlagDto[] }>(`legal-documents/${id}/curation-flags${openOnly ? '?open_only=1' : ''}`)
    .then((r) => r.data);

/** Résout (ou rouvre) une anomalie. */
export const resolveCurationFlag = (flagId: string, resolved: boolean): Promise<{ data: CurationFlagDto }> =>
  laravelClient.patch<{ data: CurationFlagDto }>(`curation-flags/${flagId}`, { resolved }).then((r) => r.data);

/** Relance la détection structurelle déterministe sur le document. */
export const detectDocumentAnomalies = (id: string): Promise<{ data: { created: number } }> =>
  laravelClient.post<{ data: { created: number } }>(`legal-documents/${id}/detect-anomalies`).then((r) => r.data);

/** Lance l'analyse sémantique (IA) du document — détecte les défauts de contenu. */
export const analyzeDocumentWithAI = (id: string): Promise<{ data: { found: number } }> =>
  laravelClient.post<{ data: { found: number } }>(`legal-documents/${id}/analyze-ai`).then((r) => r.data);

export const triggerDocumentEmbedding = (
  id: string,
): Promise<{ success: boolean; message: string; data: { pending_count: number; in_progress: boolean; batch_id?: string; total_chunks?: number } }> =>
  laravelClient
    .post<{ success: boolean; message: string; data: { pending_count: number; in_progress: boolean; batch_id?: string; total_chunks?: number } }>(
      `legal-documents/${id}/embed`,
    )
    .then((r) => r.data);

/** Interrompt l'indexation en cours (les embeddings déjà calculés sont conservés). */
export const cancelDocumentEmbedding = (
  id: string,
): Promise<{ success: boolean; message: string; data: { in_progress: boolean } }> =>
  laravelClient
    .delete<{ success: boolean; message: string; data: { in_progress: boolean } }>(`legal-documents/${id}/embed`)
    .then((r) => r.data);

/** Recherche full-text dans les articles. */
export const searchDocuments = (query: string): Promise<{ data: LaravelDocument[] }> =>
  laravelClient
    .get<{ data: LaravelDocument[] }>(`legal-documents/search?q=${encodeURIComponent(query)}`)
    .then((r) => r.data);

// ---------------------------------------------------------------------------
// Structure Nodes
// ---------------------------------------------------------------------------

export const createNode = (payload: {
  document_id: string;
  type_unite: string;
  numero?: string;
  titre?: string;
  parent_id?: string;
  sort_order?: number;
}) => laravelClient.post('structure-nodes', payload).then((r) => r.data);

export const updateNode = (id: string, payload: Partial<{
  type_unite: string;
  numero: string;
  titre: string;
  validation_status: string;
}>) => laravelClient.patch(`structure-nodes/${id}`, payload).then((r) => r.data);

export const deleteNode = (id: string) =>
  laravelClient.delete(`structure-nodes/${id}`).then((r) => r.data);

export const moveNode = (id: string, payload: { parent_id: string | null; sort_order: number }) =>
  laravelClient.post(`structure-nodes/${id}/move`, payload).then((r) => r.data);

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export const createArticle = (payload: {
  document_id: string;
  parent_node_id: string;
  numero_article: string;
  content: string;
  ordre_affichage?: number;
}) => laravelClient.post('articles', payload).then((r) => r.data);

export const updateArticle = (id: string, payload: Partial<{
  numero_article: string;
  content: string;
  validation_status: string;
  parent_node_id: string;
  ordre_affichage: number;
  source_locator: { page: number; x: number; y: number; width: number; height: number } | null;
}>) => laravelClient.patch(`articles/${id}`, payload).then((r) => r.data);

export const deleteArticle = (id: string) =>
  laravelClient.delete(`articles/${id}`).then((r) => r.data);

export const addArticleVersion = (id: string, payload: { content: string; start_date: string }) =>
  laravelClient.post(`articles/${id}/versions`, payload).then((r) => r.data);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const getArticleRelations = (articleId: string) =>
  laravelClient.get(`articles/${articleId}/relations`).then((r) => r.data);

export const createRelation = (articleId: string, payload: {
  target_article_id?: string;
  target_doc_id?: string;
  relation_type: string;
  commentaire?: string;
  effective_date?: string;
}) => laravelClient.post(`articles/${articleId}/relations`, payload).then((r) => r.data);

export const deleteRelation = (id: string) =>
  laravelClient.delete(`relations/${id}`).then((r) => r.data);

// ---------------------------------------------------------------------------
// Institutions & Types
// ---------------------------------------------------------------------------

export const getInstitutions = () => laravelClient.get('institutions').then((r) => r.data);
export const getDocumentTypes = () => laravelClient.get('document-types').then((r) => r.data);

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
export const getHomeStats = (): Promise<CatalogStats> =>
  laravelClient.get<CatalogStats>('home').then((r) => r.data);

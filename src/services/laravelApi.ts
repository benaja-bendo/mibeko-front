/**
 * laravelApi.ts — Client typé pour le backend Laravel 13 (mibeko-tableau-de-bord).
 * Toutes les requêtes passent par le proxy Vite /api/v1 → http://localhost:8000/api/v1
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LaravelDocument {
  id: string;
  type_code?: string | null;
  type?: { code: string; nom: string } | null;
  titre_officiel: string;
  reference_nor?: string | null;
  stock_code?: string | null;
  document_role?: string;
  document_key?: string | null;
  date_signature?: string | null;
  date_publication?: string | null;
  date_entree_vigueur?: string | null;
  statut?: 'vigueur' | 'abroge' | 'projet';
  curation_status?: string | null;
  extraction_status?: string | null;
  institution?: { id: string; nom: string; sigle: string } | null;
  consolidation_as_of?: string | null;
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

// ---------------------------------------------------------------------------
// Base URL — proxy Vite en dev, URL absolue via env en prod
// ---------------------------------------------------------------------------
const BASE = import.meta.env.VITE_LARAVEL_API_URL || '/api/v1';

// ---------------------------------------------------------------------------
// Fetch helper avec gestion d'erreurs uniforme
// ---------------------------------------------------------------------------
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    credentials: 'include',
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API error ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** Liste paginée des documents via /legal-documents (format standard Laravel Resource). */
export const getCatalog = (params?: {
  page?: number;
  per_page?: number;
  search?: string;
}): Promise<CatalogResponse> => {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.per_page) q.set('per_page', String(params.per_page));
  if (params?.search) q.set('q', params.search);
  // On utilise /legal-documents qui retourne {data:[...], meta:{...}} standard
  return apiFetch(`/legal-documents?${q}`);
};

/** Catalogue mobile /catalog — retourne {data:{resources:[...]}} pour sync */
export const getMobileCatalog = (): Promise<RawCatalogResponse> =>
  apiFetch('/catalog');

/** Stats du catalogue. */
export const getCatalogStats = (): Promise<CatalogStats> =>
  apiFetch('/catalog/stats');

/** Détail d'un document. */
export const getDocument = (id: string): Promise<{ data: LaravelDocument }> =>
  apiFetch(`/legal-documents/${id}`);

/** Arbre structurel d'un document. */
export const getDocumentTree = (id: string): Promise<{ data: LaravelTreeNode[] } | LaravelTreeNode[]> =>
  apiFetch(`/legal-documents/${id}/tree`);

/** URL PDF pour un document. */
export const getDocumentPdfUrl = (id: string): string =>
  `${BASE}/legal-documents/${id}/pdf`;

/** Recherche full-text dans les articles. */
export const searchDocuments = (query: string): Promise<{ data: LaravelDocument[] }> =>
  apiFetch(`/legal-documents/search?q=${encodeURIComponent(query)}`);

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
}) => apiFetch('/structure-nodes', { method: 'POST', body: JSON.stringify(payload) });

export const updateNode = (id: string, payload: Partial<{
  type_unite: string;
  numero: string;
  titre: string;
  validation_status: string;
}>) => apiFetch(`/structure-nodes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteNode = (id: string) =>
  apiFetch(`/structure-nodes/${id}`, { method: 'DELETE' });

export const moveNode = (id: string, payload: { parent_id: string | null; sort_order: number }) =>
  apiFetch(`/structure-nodes/${id}/move`, { method: 'POST', body: JSON.stringify(payload) });

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export const createArticle = (payload: {
  document_id: string;
  parent_node_id: string;
  numero_article: string;
  content: string;
  ordre_affichage?: number;
}) => apiFetch('/articles', { method: 'POST', body: JSON.stringify(payload) });

export const updateArticle = (id: string, payload: Partial<{
  numero_article: string;
  content: string;
  validation_status: string;
  parent_node_id: string;
  ordre_affichage: number;
  source_locator: { page: number; x: number; y: number; width: number; height: number } | null;
}>) => apiFetch(`/articles/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteArticle = (id: string) =>
  apiFetch(`/articles/${id}`, { method: 'DELETE' });

export const addArticleVersion = (id: string, payload: { content: string; start_date: string }) =>
  apiFetch(`/articles/${id}/versions`, { method: 'POST', body: JSON.stringify(payload) });

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const getArticleRelations = (articleId: string) =>
  apiFetch(`/articles/${articleId}/relations`);

export const createRelation = (articleId: string, payload: {
  target_article_id?: string;
  target_doc_id?: string;
  relation_type: string;
  commentaire?: string;
  effective_date?: string;
}) => apiFetch(`/articles/${articleId}/relations`, { method: 'POST', body: JSON.stringify(payload) });

export const deleteRelation = (id: string) =>
  apiFetch(`/relations/${id}`, { method: 'DELETE' });

// ---------------------------------------------------------------------------
// Institutions & Types
// ---------------------------------------------------------------------------

export const getInstitutions = () => apiFetch('/institutions');
export const getDocumentTypes = () => apiFetch('/document-types');

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
export const getHomeStats = (): Promise<CatalogStats> =>
  apiFetch('/home');

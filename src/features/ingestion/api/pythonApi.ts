/**
 * pythonApi.ts — Client typé pour le backend Python FastAPI (mibeko-python).
 * Toutes les requêtes passent par le proxy Vite /py → http://localhost:8001
 * Le rewrite Vite enlève /py, donc /py/api/... → /api/... sur le serveur Python.
 */

import { pythonClient, pythonBaseUrl as BASE } from '@/shared/api';

// ---------------------------------------------------------------------------
// Types Python API
// ---------------------------------------------------------------------------

export interface PythonDocumentSummary {
  id: string;
  titre_officiel: string;
  stock_code?: string | null;
  document_role?: string | null;
  type_code?: string | null;
  extraction_status?: string | null;
  curation_status?: string | null;
  has_md: boolean;
  has_json: boolean;
  latest_run_source?: string | null;
  latest_run_status?: string | null;
  created_at?: string | null;
}

export interface PythonMediaFile {
  id: string;
  document_id: string;
  file_path: string;
  storage_provider: string;
  original_filename?: string | null;
  mime_type?: string | null;
  file_category?: string | null;
  file_size?: number | null;
  description?: string | null;
  created_at?: string | null;
}

export interface PythonExtractionRun {
  id: string;
  document_id: string;
  source?: string | null;
  status: string;
  started_at?: string | null;
  finished_at?: string | null;
  source_media_file_id?: string | null;
  markdown_media_file_id?: string | null;
  json_media_file_id?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface PythonDocumentDetail extends PythonDocumentSummary {
  document_key?: string | null;
  statut?: string | null;
  date_publication?: string | null;
  date_signature?: string | null;
  consolidation_as_of?: string | null;
  files: PythonMediaFile[];
  extraction_runs: PythonExtractionRun[];
  nb_articles: number;
  nb_nodes: number;
}

export interface PythonDocumentStats {
  document_id: string;
  nb_articles: number;
  nb_nodes: number;
  nb_extraction_runs: number;
  nb_media_files: number;
  extraction_status?: string | null;
  curation_status?: string | null;
}

export interface PythonGlobalStats {
  total_documents: number;
  documents_completed: number;
  documents_processing: number;
  documents_pending: number;
  documents_failed: number;
  total_articles: number;
  total_runs: number;
  runs_running: number;
}

export interface PythonArticleVersion {
  id: string;
  article_id: string;
  contenu_texte?: string | null;
  validation_status?: string | null;
  is_verified: boolean;
  created_at?: string | null;
}

export interface PythonArticle {
  id: string;
  document_id: string;
  parent_node_id?: string | null;
  numero_article?: string | null;
  ordre_affichage: number;
  validation_status?: string | null;
  created_at?: string | null;
  versions: PythonArticleVersion[];
}

export interface PaginatedArticles {
  items: PythonArticle[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  db: string;
  timestamp: string;
}

export interface UploadResponse {
  message: string;
  document_id: string;
}

export interface ParseResponse {
  message: string;
  run_id: string;
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------
async function pyFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method || 'GET';
  let data = options?.body;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { /* ignore */ }
  }

  const response = await pythonClient.request<T>({
    url: path.startsWith('/') ? path.slice(1) : path,
    method,
    data,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signal: options?.signal as any,
  });

  return response.data;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export const getPythonHealth = (): Promise<HealthStatus> =>
  pyFetch('/health');

// ---------------------------------------------------------------------------
// Documents (Python — ingestion)
// ---------------------------------------------------------------------------

/** Liste des documents gérés par le Python (ingestion). */
export const getPythonDocuments = (params?: {
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<PythonDocumentSummary[]> => {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.offset) q.set('offset', String(params.offset));
  if (params?.status) q.set('status', params.status);
  return pyFetch(`/documents?${q}`);
};

/** Statistiques globales (KPIs dashboard). */
export const getPythonGlobalStats = (): Promise<PythonGlobalStats> =>
  pyFetch('/documents/stats');

/** Détail complet d'un document. */
export const getPythonDocument = (id: string): Promise<PythonDocumentDetail> =>
  pyFetch(`/documents/${id}`);

/** Stats d'un document (nb articles, nodes, runs). */
export const getPythonDocumentStats = (id: string): Promise<PythonDocumentStats> =>
  pyFetch(`/documents/${id}/stats`);

/** ExtractionRuns d'un document. */
export const getPythonDocumentRuns = (id: string): Promise<PythonExtractionRun[]> =>
  pyFetch(`/documents/${id}/runs`);

/** MediaFiles d'un document. */
export const getPythonDocumentFiles = (id: string): Promise<PythonMediaFile[]> =>
  pyFetch(`/documents/${id}/files`);

/** Articles extraits d'un document (paginés). */
export const getPythonDocumentArticles = (
  id: string,
  page = 1,
  perPage = 50
): Promise<PaginatedArticles> =>
  pyFetch(`/documents/${id}/articles?page=${page}&per_page=${perPage}`);

/** Supprime un document du Python. */
export const deletePythonDocument = (id: string): Promise<void> =>
  pyFetch(`/documents/${id}`, { method: 'DELETE' });

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Upload un PDF (+ MD/JSON optionnels) pour ingestion.
 * Utilise FormData directement car multipart/form-data.
 */
export const uploadDocument = async (formData: FormData): Promise<UploadResponse> => {
  const res = await pythonClient.post<UploadResponse>('/documents/upload', formData, {
    headers: { 'Accept': 'application/json', 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Déclenche le parsing structurel d'un document depuis un artefact MD ou JSON.
 */
export const parseDocument = async (
  docId: string,
  sourceFormat: 'md' | 'json'
): Promise<ParseResponse> => {
  const fd = new FormData();
  fd.append('source_format', sourceFormat);

  const res = await pythonClient.post<ParseResponse>(`/documents/${docId}/parse`, fd, {
    headers: { 'Accept': 'application/json', 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ---------------------------------------------------------------------------
// SSE — Server-Sent Events
// ---------------------------------------------------------------------------

/**
 * Ouvre une connexion SSE vers le backend Python pour les notifications temps réel.
 * Retourne une fonction de nettoyage à appeler pour fermer la connexion.
 */
export const openPythonStream = (
  onUpdate: () => void,
  onNotification: (payload: { message: string; type: 'success' | 'error' | 'info' }) => void
): (() => void) => {
  const es = new EventSource(`${BASE}/stream`);

  es.addEventListener('update', () => onUpdate());

  es.addEventListener('notification', (event) => {
    try {
      const data = JSON.parse(event.data);
      onNotification(data);
    } catch {
      // ignore malformed payloads
    }
  });

  es.onerror = () => {
    // SSE will auto-reconnect — no action needed
  };

  return () => es.close();
};

import { laravelClient } from '@/shared/api';

/**
 * relationsApi.ts — Relations modification/abrogation candidates (dashboard#123).
 *
 * Toutes les routes vivent sous /api/v1/* et sont protégées côté backend par
 * le middleware `role:editor|admin`. Réponses sur l'enveloppe standard
 * `{ success, message, data }`, paginée pour la liste.
 */

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type RelationStatus = 'candidate' | 'confirmed' | 'rejected';

export type RelationType = 'CREE' | 'MODIFIE' | 'ABROGE' | 'CITE' | 'COMPLETE' | 'RENUMEROTE';

export interface RelationDocumentRef {
  id: string;
  titre_officiel: string;
}

export interface RelationArticleRef {
  id: string;
  numero_article: string;
}

/**
 * Forme JSON exacte d'une relation : les relations Eloquent chargées
 * (`sourceDocument`/`targetDocument`/`sourceArticle`/`targetArticle`) sont
 * sérialisées en snake_case par Laravel, pas dans leur casse de méthode PHP.
 */
export interface DocumentRelationItem {
  id: string;
  relation_type: RelationType;
  status: RelationStatus;
  source: 'heuristic' | 'human';
  confidence: number | null;
  commentaire: string | null;
  effective_date: string | null;
  meta: { extrait_source?: string } | null;
  source_doc_id: string | null;
  target_doc_id: string | null;
  source_article_id: string | null;
  target_article_id: string | null;
  source_document: RelationDocumentRef | null;
  target_document: RelationDocumentRef | null;
  source_article: RelationArticleRef | null;
  target_article: RelationArticleRef | null;
  created_at: string | null;
  reviewed_at: string | null;
}

export interface RelationFilters {
  status?: RelationStatus;
  relation_type?: RelationType;
  document_id?: string;
  page?: number;
  per_page?: number;
}

export interface RelationListResult {
  data: DocumentRelationItem[];
  pagination: { total: number; per_page: number; current_page: number; last_page: number };
}

export const listRelations = (filters: RelationFilters = {}): Promise<RelationListResult> => {
  const q = new URLSearchParams();
  q.set('status', filters.status ?? 'candidate');
  if (filters.relation_type) q.set('relation_type', filters.relation_type);
  if (filters.document_id) q.set('document_id', filters.document_id);
  if (filters.page) q.set('page', String(filters.page));
  q.set('per_page', String(filters.per_page ?? 20));
  return laravelClient.get<RelationListResult>(`document-relations?${q.toString()}`).then((r) => r.data);
};

/** Confirme une relation candidate. */
export const validateRelation = (id: string): Promise<DocumentRelationItem> =>
  laravelClient.post<Envelope<DocumentRelationItem>>(`relations/${id}/valider`).then((r) => r.data.data);

/** Rejette une relation candidate — conservée, jamais supprimée. */
export const rejectRelation = (id: string, commentaire?: string): Promise<DocumentRelationItem> =>
  laravelClient
    .post<Envelope<DocumentRelationItem>>(`relations/${id}/rejeter`, commentaire ? { commentaire } : {})
    .then((r) => r.data.data);

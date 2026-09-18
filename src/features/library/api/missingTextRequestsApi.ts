/**
 * missingTextRequestsApi.ts — « Demander ce texte » (mibeko-front#34).
 *
 * Réutilise `curation_flags` côté backend (source=report, sans cible) plutôt
 * qu'un canal dédié : c'est ce qui permet à `getMyMissingTextRequests` de
 * retrouver les demandes de l'utilisateur courant.
 */

import { laravelClient } from '@/shared/api/laravelClient';

export interface MissingTextRequest {
  id: string;
  description: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface MissingTextRequestPage {
  data: MissingTextRequest[];
  pagination: { current_page: number; last_page: number; total: number };
}

export const requestMissingText = (description: string) =>
  laravelClient
    .post<{ data: MissingTextRequest }>('library/missing-text-requests', { description })
    .then((r) => r.data.data);

export const getMyMissingTextRequests = (page = 1) =>
  laravelClient
    .get<MissingTextRequestPage>('library/missing-text-requests', { params: { page } })
    .then((r) => r.data);

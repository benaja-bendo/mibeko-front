/**
 * watchesApi.ts — Accès réseau de la feature Watches (backend Laravel,
 * mibeko-dashboard#125).
 *
 * L'API distingue deux vocabulaires : l'alias court `"document"|"theme"` en
 * écriture (`POST /watches`), et la classe Eloquent brute (`watchable_type`,
 * ex. `App\Models\LegalDocument`) en lecture (relation `MorphTo` sérialisée
 * telle quelle, sans Resource côté backend). Cette correspondance reste
 * interne à ce fichier — le reste du front ne connaît que `WatchableType`.
 */

import { laravelClient } from '@/shared/api';
import type { WatchableType, WatchedDocument, WatchedTheme, WatchSubscription } from '@/features/watches/types';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

const THEME_CLASS = 'App\\Models\\Tag';

interface ApiWatch {
  id: string;
  watchable_type: string;
  watchable_id: string;
  watchable: WatchedDocument | WatchedTheme;
  created_at: string;
}

function typeFromClass(raw: string): WatchableType {
  return raw === THEME_CLASS ? 'theme' : 'document';
}

function mapWatch(api: ApiWatch): WatchSubscription {
  return {
    id: api.id,
    watchableType: typeFromClass(api.watchable_type),
    watchableId: api.watchable_id,
    watchable: api.watchable,
    createdAt: api.created_at,
  };
}

/** Liste les abonnements de l'utilisateur courant (textes et thèmes confondus). */
export async function listWatches(): Promise<WatchSubscription[]> {
  const { data } = await laravelClient.get<Envelope<ApiWatch[]>>('watches');
  return data.data.map(mapWatch);
}

/**
 * Abonne l'utilisateur courant à un texte ou un thème. Idempotent côté
 * serveur : rejouer le même couple (type, id) renvoie l'abonnement existant.
 */
export async function createWatch(
  watchableType: WatchableType,
  watchableId: string,
): Promise<WatchSubscription> {
  const { data } = await laravelClient.post<Envelope<ApiWatch>>('watches', {
    watchable_type: watchableType,
    watchable_id: watchableId,
  });
  return mapWatch(data.data);
}

/** Retire un abonnement (id = celui de la ligne d'abonnement, pas de la cible). */
export async function deleteWatch(id: string): Promise<void> {
  await laravelClient.delete(`watches/${id}`);
}

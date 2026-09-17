/**
 * types.ts — Abonnement à un texte ou un thème suivi (mibeko-dashboard#125).
 *
 * Distinct des préférences de notification (`features/settings`, matrice
 * type × canal) : ici, l'utilisateur cible explicitement UN texte ou UN
 * thème précis, pas une catégorie générale d'alertes.
 */

export type WatchableType = 'document' | 'theme';

/** Forme minimale d'un texte suivi, telle qu'affichée dans la liste des abonnements. */
export interface WatchedDocument {
  id: string;
  titre_officiel: string | null;
}

/** Forme minimale d'un thème suivi. */
export interface WatchedTheme {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface WatchSubscription {
  id: string;
  watchableType: WatchableType;
  watchableId: string;
  watchable: WatchedDocument | WatchedTheme;
  createdAt: string;
}

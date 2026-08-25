import { hasRole, isProOrAbove, type User } from '@/shared/types/auth';

/**
 * Destination par défaut d'un utilisateur authentifié.
 *
 * Source unique de vérité : la règle vivait auparavant en trois exemplaires
 * divergents — `getDefaultRedirect` dans `LoginPage`, `RedirectIfAuthenticated`
 * et `RootRedirect` dans `guards.tsx` — et les trois envoyaient vers `/app*`,
 * qui exige `user_pro`. Un compte fraîchement créé était donc accueilli par
 * « Fonctionnalité réservée aux abonnés Pro » quel que soit le chemin emprunté.
 *
 * Deux changements par rapport aux copies précédentes :
 *  - un compte sans abonnement atterrit sur son compte, d'où il voit son
 *    profil, l'état de son offre et l'application mobile ;
 *  - un administrateur va sur `/admin` et non plus sur `/editor` après
 *    connexion. C'est la règle que `RootRedirect` appliquait déjà — la retenir
 *    partout évite qu'une même personne atterrisse à deux endroits selon
 *    qu'elle se connecte ou qu'elle ouvre la racine.
 */
export function defaultRedirectFor(user: User | null): string {
  if (!user) return '/auth/login';
  if (hasRole(user, 'admin')) return '/admin';
  if (hasRole(user, 'editor')) return '/editor';
  if (isProOrAbove(user)) return '/app/library';
  return '/settings/account';
}

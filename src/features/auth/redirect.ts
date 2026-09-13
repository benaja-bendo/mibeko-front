import { hasRole, requiresEmailVerification, type User } from '@/shared/types/auth';

/**
 * Destination par défaut d'un utilisateur authentifié.
 *
 * Source unique de vérité : la règle vivait auparavant en trois exemplaires
 * divergents — `getDefaultRedirect` dans `LoginPage`, `RedirectIfAuthenticated`
 * et `RootRedirect` dans `guards.tsx`.
 *
 * mibeko-front#24 : un compte sans abonnement atterrit désormais sur la
 * bibliothèque, comme tout le monde. Le détour par `/settings/account` était
 * un pansement, pas un choix de produit — il évitait le « Fonctionnalité
 * réservée aux abonnés Pro » que `/app/library` renvoyait alors, en accueillant
 * un nouveau venu par ses réglages plutôt que par le fonds. La garde de rôle
 * ayant disparu de ces routes, le détour n'a plus de cause et il ne reste
 * qu'une seule règle : le staff va dans son espace de travail, tous les autres
 * vont au fonds.
 */
export function defaultRedirectFor(user: User | null): string {
  if (!user) return '/auth/login';
  if (requiresEmailVerification(user)) return '/auth/verifier-email';
  if (hasRole(user, 'admin')) return '/admin';
  if (hasRole(user, 'editor')) return '/editor';
  return '/app/library';
}

/**
 * Destination après auto-inscription, en conservant uniquement les intentions
 * connues. Une valeur arbitraire ne devient jamais une URL de redirection.
 */
export function redirectAfterRegistration(user: User | null, next: string | null): string {
  if (!user) return defaultRedirectFor(user);
  if (requiresEmailVerification(user)) {
    return next === 'assistant'
      ? '/auth/verifier-email?next=assistant'
      : '/auth/verifier-email';
  }
  if (next === 'assistant') return '/app/assistant';
  return defaultRedirectFor(user);
}

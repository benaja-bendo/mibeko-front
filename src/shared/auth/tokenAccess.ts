/**
 * tokenAccess.ts — Point d'accès minimal au jeton d'authentification, côté `shared`.
 *
 * Les couches basses (clients HTTP axios, flux SSE) ont besoin du jeton courant
 * sans pouvoir importer `features/auth` : ce serait une inversion de dépendance
 * FSD (`shared` → `features` interdit). On expose donc ici deux fonctions pures :
 *
 *  - `getStoredToken()` : lit le jeton actif (ou `null`) ;
 *  - `onUnauthorized()` : purge la session sur un 401.
 *
 * `features/auth` *alimente* ce module au démarrage via `configureTokenAccess`
 * (voir `authStore`), inversant ainsi la dépendance dans le bon sens
 * (`features` → `shared`).
 */

/** Fournisseur du jeton courant (branché par `features/auth`). */
type TokenProvider = () => string | null;
/** Réaction à un 401 : purge de l'auth (branchée par `features/auth`). */
type UnauthorizedHandler = () => void;

let tokenProvider: TokenProvider = () => null;
let unauthorizedHandler: UnauthorizedHandler = () => {};

/**
 * Branche les implémentations réelles. Appelé une fois, tôt, par `features/auth`
 * (au chargement du module `authStore`), avant toute requête réseau.
 */
export function configureTokenAccess(config: {
  getToken: TokenProvider;
  onUnauthorized: UnauthorizedHandler;
}): void {
  tokenProvider = config.getToken;
  unauthorizedHandler = config.onUnauthorized;
}

/** Jeton d'authentification courant, ou `null` si non connecté. */
export function getStoredToken(): string | null {
  return tokenProvider();
}

/**
 * À appeler quand une réponse 401 est reçue : purge la session (jeton mort),
 * pour éviter d'enchaîner les 401 silencieux.
 */
export function handleUnauthorized(): void {
  unauthorizedHandler();
}

/**
 * Onglet resté sur un build remplacé (mibeko-front#68).
 *
 * Chaque page est un fichier `/assets/<Page>-<hash>.js` chargé à la demande,
 * et chaque déploiement remplace le conteneur nginx : seuls les fichiers du
 * nouveau build existent. Un onglet ouvert avant garde l'ancien bundle
 * d'entrée et demande, à la première visite d'une page, un nom de fichier qui
 * répond 404. Recharger suffit : `index.html` est servi en `no-cache`, l'onglet
 * repart donc sur les noms du build en ligne.
 */

/**
 * Aucun code d'erreur n'est commun aux navigateurs pour un `import()` qui
 * échoue : on reconnaît leurs messages, plus celui du préchargement CSS de Vite.
 */
const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i, // Chrome, Edge
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
  /Unable to preload CSS/i, // Vite
];

const RELOADED_AT_KEY = 'mibeko:rechargement-build';

/**
 * Un nouvel échec si tôt après notre propre rechargement veut dire que le
 * fichier manque vraiment (build cassé, conteneur en cours de remplacement) :
 * on s'arrête au lieu de boucler.
 */
const RELOAD_GUARD_MS = 10_000;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Recharge la page pour passer sur le build en ligne. Rend `false` sans
 * recharger quand le réseau est coupé (le navigateur afficherait sa propre
 * page d'erreur), quand l'onglet vient déjà d'être rechargé pour cette raison,
 * ou quand `sessionStorage` est inaccessible (sans garde-fou, pas de
 * rechargement automatique). À l'appelant d'offrir alors une issue manuelle.
 */
export function reloadForNewBuild(
  reload: () => void = () => window.location.reload(),
): boolean {
  if (!navigator.onLine) return false;
  try {
    const lastReloadAt = Number(sessionStorage.getItem(RELOADED_AT_KEY));
    if (Date.now() - lastReloadAt < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
  } catch {
    return false;
  }
  reload();
  return true;
}

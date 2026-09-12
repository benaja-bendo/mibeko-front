/**
 * onboardingCopy.ts — Dictionnaire FR des `*_key` (`title_key`, `body_key`,
 * `cta_key`) portées par la définition serveur du parcours (mibeko-dashboard#136).
 *
 * Ces clés ne sont JAMAIS traduites côté backend (vérifié : elles n'existent
 * que comme identifiants dans `OnboardingJourneySeeder.php`) — le front porte
 * seul cette traduction, avec repli sûr sur clé inconnue (une version future
 * du parcours ne doit jamais afficher une clé technique brute ni planter).
 *
 * Exception volontaire : les `label_key` des options de `usage_context`
 * (`onboarding.usage_context.*`) ne sont PAS résolues ici — `UsageContextStep`
 * utilise `usageContextLabel(code)` (`shared/lib/labels.ts`), seule source de
 * vérité de ces 4 libellés, partagée avec les Paramètres.
 */

const ONBOARDING_COPY: Record<string, string> = {
  'onboarding.welcome.title': 'Bienvenue sur Mibeko',
  'onboarding.welcome.body':
    "Trouvez et comprenez les textes juridiques du Congo-Brazzaville et de l'OHADA. Recherchez un texte ou posez une question, puis consultez les sources. Aucun résultat juridique n'est garanti.",
  'onboarding.discover_sources.title': 'Que voulez-vous faire aujourd\'hui ?',
  'onboarding.discover_sources.cta': 'Continuer',
};

/** Résout une `*_key` en texte FR ; retombe sur `fallback` (jamais la clé brute) si inconnue ou absente. */
export function onboardingCopy(key: string | null | undefined, fallback = ''): string {
  if (!key) return fallback;
  return ONBOARDING_COPY[key] ?? fallback;
}

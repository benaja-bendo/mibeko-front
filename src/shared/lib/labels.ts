/**
 * Lexique métier : traduit les codes techniques internes en libellés humains
 * pour l'utilisateur final (curateur juriste). Le code reste disponible en
 * sous-texte / tooltip. Source unique de la terminologie de l'interface.
 */

/** Rôle documentaire : STOCK = texte consolidé, FLUX = acte de journal officiel. */
export function documentRoleLabel(role: string | null | undefined, opts: { short?: boolean } = {}): string {
  switch (role) {
    case 'STOCK':
      return opts.short ? 'Consolidé' : 'Texte consolidé';
    case 'FLUX':
      return opts.short ? 'Journal off.' : 'Acte de journal officiel';
    default:
      return role || '—';
  }
}

/** Description longue d'un rôle (tooltip). */
export function documentRoleHint(role: string | null | undefined): string {
  switch (role) {
    case 'STOCK':
      return 'Texte consolidé (code, loi, constitution…)';
    case 'FLUX':
      return "Acte issu d'un Journal officiel (décret, arrêté, nomination…)";
    default:
      return '';
  }
}

/** Libellé humain de la fonctionnalité d'indexation sémantique (« embedding »). */
export const SEARCH_AI_LABEL = 'Recherche IA';

/** Périmètre juridique. */
export function legalScopeLabel(scope: string | null | undefined): string {
  switch (scope) {
    case 'national':
      return 'National';
    case 'ohada':
      return 'OHADA';
    case 'communautaire':
      return 'Communautaire';
    default:
      return scope || '—';
  }
}

/**
 * Cadre d'usage déclaré par le compte — miroir français des codes
 * `MobileProfile::USAGE_CONTEXTS` (mibeko-dashboard#135). Source unique :
 * consommé par les Paramètres (`IdentityCard`) et l'accueil d'onboarding
 * (front#40), qui ne doivent jamais diverger sur ces 4 libellés.
 */
export function usageContextLabel(code: string | null | undefined): string {
  switch (code) {
    case 'personal':
      return 'Personnel';
    case 'studies':
      return 'Études';
    case 'professional':
      return 'Activité professionnelle';
    case 'other':
      return 'Autre';
    default:
      return code || '—';
  }
}

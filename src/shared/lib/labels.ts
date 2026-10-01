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

/** Étape d'un travail de la file d'ingestion (`ingestion_jobs.step`, mibeko-python#23). */
export function ingestionJobStepLabel(step: string | null | undefined): string {
  switch (step) {
    case 'recu':
      return 'Reçu';
    case 'parse':
      return 'Extraction (OCR)';
    case 'structure':
      return 'Structuration';
    case 'controle':
      return 'Contrôle';
    case 'termine':
      return 'Terminé';
    default:
      return step || '—';
  }
}

/** Origine d'un travail de la file d'ingestion (`ingestion_jobs.kind`). */
export function ingestionJobKindLabel(kind: string | null | undefined): string {
  switch (kind) {
    case 'depot':
      return 'Dépôt web';
    case 'veille':
      return 'Veille';
    case 'reprise':
      return 'Reprise';
    default:
      return kind || '—';
  }
}

/**
 * Classe d'erreur d'un travail en échec (`ingestion_jobs.error_class`) —
 * explique à l'éditeur pourquoi « relancer » a un sens ou non.
 */
export function ingestionErrorClassLabel(errorClass: string | null | undefined): string {
  switch (errorClass) {
    case 'transitoire':
      return 'Incident réseau ou quota';
    case 'definitive':
      return 'Échec définitif';
    case 'information_manquante':
      return 'Information manquante — nécessite une correction';
    default:
      return errorClass || '';
  }
}

/**
 * Ce que contient un numéro du Journal officiel, annoncé au lecteur. Un numéro
 * publié sans texte structuré reste lisible par son PDF officiel : on dit ce
 * qu'il contient, jamais « 0 texte », qui le ferait passer pour vide (décision
 * D-056). Mêmes libellés que l'application mobile.
 */
export function journalContentLabel(count: number | null | undefined): string {
  const n = count ?? 0;
  if (n <= 0) return 'Texte intégral (PDF)';
  return `${n} texte${n > 1 ? 's' : ''} publié${n > 1 ? 's' : ''}`;
}

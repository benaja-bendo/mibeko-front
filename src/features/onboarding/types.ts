/**
 * types.ts — Contrat du moteur d'onboarding (mibeko-dashboard#136).
 *
 * Champs alignés strictement sur les fixtures backend testées par
 * comparaison stricte côté serveur (immuables sans casser un test Pest) :
 * `mibeko-tableau-de-bord/tests/Fixtures/Onboarding/*.json`.
 */

export type OnboardingStepType =
  | 'welcome'
  | 'single_choice'
  | 'multi_choice'
  | 'optional_field'
  | 'guided_action'
  | 'checklist';

export type OnboardingStepAction = 'view' | 'answer' | 'skip';

export type OnboardingEnrollmentStatus = 'not_started' | 'in_progress' | 'postponed' | 'completed';

export type OnboardingPlatform = 'web' | 'mobile';

export interface OnboardingStepProgress {
  viewed_at: string | null;
  skipped_at: string | null;
  completed_at: string | null;
  value: unknown;
}

/** `config.options` d'une étape `single_choice`/`multi_choice` à options inlinées. */
export interface OnboardingChoiceOption {
  code: string;
  label_key: string;
}

export interface OnboardingStepDefinition {
  key: string;
  type: OnboardingStepType;
  scope: 'common' | 'web' | 'mobile';
  binding: string | null;
  /** Forme dépendante de `type` — narrowée dans chaque composant `steps/*`. */
  config: Record<string, unknown>;
  conditions: unknown[];
  /** `false` si `type` n'est pas dans le `known_step_types` déclaré par ce client — jamais bloquant, cf. OnboardingHost (auto-skip silencieux). */
  supported: boolean;
  progress: OnboardingStepProgress;
}

export interface OnboardingJourneyDefinition {
  key: string;
  version: number;
  steps: OnboardingStepDefinition[];
}

export interface OnboardingEnrollment {
  status: OnboardingEnrollmentStatus;
  started_at: string | null;
  completed_at: string | null;
  postponed_at: string | null;
  replay_count: number;
}

export interface OnboardingJourneyResponse {
  /** `false` si aucune version active n'existe pour la clé — jamais 404/500, l'accès au produit reste normal. */
  available: boolean;
  journey: OnboardingJourneyDefinition | null;
  enrollment: OnboardingEnrollment | null;
}

export interface OnboardingStepMutationPayload {
  action: OnboardingStepAction;
  value?: unknown;
  /** Idempotence réseau (retry) — généré côté client à chaque appel, jamais mémorisé entre deux actions utilisateur distinctes. */
  client_mutation_id: string;
  /** LWW — horloge CLIENT (`Date.now()`), jamais l'horloge serveur. */
  client_updated_at: number;
  platform: OnboardingPlatform;
}

export interface OnboardingStepMutationResponse {
  step: (Pick<OnboardingStepProgress, 'viewed_at' | 'skipped_at' | 'completed_at' | 'value'> & { key: string }) | null;
  enrollment: OnboardingEnrollment;
}

/**
 * Génère un identifiant local (idempotence réseau : `client_mutation_id`,
 * `client_event_id`…). Repli si `crypto.randomUUID` est indisponible — même
 * idiome que `localId()` dans `features/assistant/hooks/useAssistantChat.ts`,
 * extrait ici pour être partagé par l'onboarding et les événements produit
 * (front#40) sans dupliquer une troisième fois cette logique.
 */
export function generateClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

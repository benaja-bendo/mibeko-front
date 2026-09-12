/**
 * types.ts — Contrat de `POST /api/v1/product-events` (mibeko-dashboard#137).
 *
 * Mesure de l'activation produit SANS jamais collecter de texte de requête,
 * de réponse juridique, de téléphone ou d'email — uniquement des identifiants
 * opaques et des horodatages serveur. Champs alignés sur
 * `mibeko-tableau-de-bord/tests/Fixtures/ProductEvents/*.json`.
 */

export type ProductEventType = 'search_useful' | 'source_opened_after_answer';

export interface ProductEventPayload {
  event_type: ProductEventType;
  surface: 'web' | 'mobile';
  /** Article existant pour `search_useful` ; `AiUsageLog` du compte (succès, cité) pour `source_opened_after_answer`. */
  reference_id: string;
  duration_ms?: number;
  client_event_id: string;
}

export interface ProductEventResponse {
  id: string;
  event_type: ProductEventType;
  created_at: string;
}

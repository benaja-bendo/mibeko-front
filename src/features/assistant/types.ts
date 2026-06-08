/**
 * types.ts — Contrats de données de l'Assistant IA juridique (Mibeko IA).
 *
 * Ces types reflètent fidèlement le contrat du backend Laravel
 * (`AiAssistantController`) qui héberge l'agent RAG `MibekoIA` :
 *  - le streaming de la réponse se fait en SSE (`text/event-stream`) ;
 *  - les citations proviennent de l'outil `SearchLegalDatabase`
 *    (recherche hybride vectorielle + plein-texte sur la base juridique).
 */

/** Une citation/source juridique renvoyée par l'IA (cliquable vers la Bibliothèque). */
export interface AssistantSource {
  /** Identifiant de l'article (article_id côté base). */
  id: string;
  /** Numéro d'article (ex. "12"). */
  number?: string | null;
  /** Extrait / contenu textuel de l'article. */
  content?: string | null;
  /** Document parent (pour la navigation vers la Bibliothèque). */
  document_id?: string | null;
  document_title?: string | null;
  document_type?: string | null;
  /** Titre du nœud structurel (Titre / Chapitre / Section). */
  node_title?: string | null;
  /** Fil d'Ariane "Type > Document > Section". */
  breadcrumb?: string | null;
  /** Score de pertinence hybride (0–1). */
  score?: number | null;
}

export type ChatRole = 'user' | 'assistant';

/** Message affiché dans le fil de discussion (état UI, pas la persistance brute). */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Citations rattachées à une réponse de l'assistant. */
  sources?: AssistantSource[];
  createdAt?: string;
  /** `true` pendant que la réponse est en cours de streaming. */
  pending?: boolean;
  /** `true` si la génération a échoué. */
  error?: boolean;
}

/** Résumé de conversation (liste de l'historique). */
export interface ConversationSummary {
  id: string;
  title: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Message tel que persisté côté Laravel (table `agent_conversation_messages`). */
export interface PersistedMessage {
  id: string;
  role: ChatRole;
  content: string;
  meta?: { sources?: AssistantSource[]; cached?: boolean } | null;
  created_at?: string;
}

/** Détail complet d'une conversation, messages inclus. */
export interface ConversationDetail extends ConversationSummary {
  messages: PersistedMessage[];
}

/** Réponse paginée Laravel pour la liste des conversations. */
export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/**
 * Callbacks branchés sur le flux SSE de `POST /assistant/chat/{id?}`.
 * Chaque callback correspond à un type d'événement émis par le backend.
 */
export interface StreamCallbacks {
  /** Statut intermédiaire (ex. "Recherche dans la base juridique…"). */
  onStatus?: (message: string) => void;
  /** Sources/citations détectées avant ou pendant la génération. */
  onSources?: (sources: AssistantSource[]) => void;
  /** Fragment de texte de la réponse (effet machine à écrire). */
  onDelta?: (delta: string) => void;
  /** Erreur de génération côté serveur. */
  onError?: (message: string) => void;
  /** Identifiant de conversation (créé si premier message). */
  onConversationId?: (id: string) => void;
  /** Fin du flux (`[DONE]`). */
  onDone?: () => void;
}

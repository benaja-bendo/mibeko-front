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

/** Avis de l'utilisateur sur une réponse de l'assistant. */
export type FeedbackRating = 'up' | 'down';

/**
 * Mode de réponse de l'IA :
 *  - `concise`  : réponse directe en quelques phrases (défaut) ;
 *  - `analysis` : analyse structurée (fondements, exceptions, vigilance).
 */
export type AssistantMode = 'concise' | 'analysis';

/** Document épinglé dans le composer pour restreindre la recherche de l'IA. */
export interface AssistantReference {
  id: string;
  title: string;
  type_code?: string | null;
  type_name?: string | null;
}

/** Options d'envoi d'un message (mode + références épinglées). */
export interface SendMessageOptions {
  mode?: AssistantMode;
  references?: AssistantReference[];
  /**
   * Conversation cible explicite. Passé par la page quand l'utilisateur écrit
   * depuis une conversation d'historique affichée en lecture (le fil est alors
   * « adopté » par le chat avec `seedMessages` comme base).
   */
  conversationId?: string | null;
  /** Messages persistés servant de base au fil adopté. */
  seedMessages?: ChatMessage[];
}

/** Message affiché dans le fil de discussion (état UI, pas la persistance brute). */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Citations rattachées à une réponse de l'assistant. */
  sources?: AssistantSource[];
  /** Références épinglées avec un message utilisateur. */
  references?: AssistantReference[];
  /** Mode demandé pour ce message (affiché si ≠ concise). */
  mode?: AssistantMode;
  createdAt?: string;
  /** `true` pendant que la réponse est en cours de streaming. */
  pending?: boolean;
  /** `true` si la génération a échoué. */
  error?: boolean;
  /**
   * `true` quand l'assistant a interrogé le corpus et n'y a trouvé aucun
   * extrait : la réponse est une non-réponse assumée, pas un texte tronqué.
   * Le backend le dit explicitement (évènement SSE `no_result`, champ
   * `no_result` en JSON) — le front ne le déduit jamais de l'absence de source,
   * qui vaudrait aussi pour une salutation.
   */
  noResult?: boolean;
  /**
   * Identifiant backend du message (table `agent_conversation_messages`).
   * Pour une réponse fraîchement streamée, `id` est local : le backend renvoie
   * son identifiant réel en fin de flux afin de pouvoir noter la réponse.
   * Absent pour les messages d'historique, dont `id` est déjà l'id backend.
   */
  backendId?: string;
  /** Avis de l'utilisateur courant sur cette réponse (null = non noté). */
  feedback?: FeedbackRating | null;
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
  meta?: {
    sources?: AssistantSource[];
    cached?: boolean;
    /** Non-réponse assumée (corpus interrogé, aucun extrait). */
    no_result?: boolean;
    /** Références épinglées au moment de l'envoi (messages utilisateur). */
    references?: AssistantReference[];
    /** Mode demandé (absent si concise). */
    mode?: AssistantMode;
  } | null;
  /** Avis de l'utilisateur courant sur ce message (réponses assistant). */
  feedback?: FeedbackRating | null;
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
  /** Le corpus a été interrogé sans rien rendre : non-réponse assumée. */
  onNoResult?: () => void;
  /** Erreur de génération côté serveur. */
  onError?: (message: string) => void;
  /** Identifiant de conversation (créé si premier message). */
  onConversationId?: (id: string) => void;
  /** Identifiant backend du message assistant (émis en fin de flux). */
  onMessageId?: (id: string) => void;
  /** Fin du flux (`[DONE]`). */
  onDone?: () => void;
}

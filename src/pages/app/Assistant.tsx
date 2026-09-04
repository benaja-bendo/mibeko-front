/**
 * Assistant.tsx — Espace "Assistant IA juridique" (Mibeko IA).
 *
 * Interface de chat professionnelle connectée au backend Laravel (agent RAG) :
 *  - streaming SSE avec effet machine à écrire ;
 *  - citations cliquables renvoyant vers la Bibliothèque ;
 *  - historique des conversations dans un panneau latéral redimensionnable.
 *
 * Architecture d'affichage — une seule source de vérité par conversation :
 *  - la conversation « vivante » (où l'on écrit/streame) vit dans useAssistantChat ;
 *  - une conversation d'historique est rendue DIRECTEMENT depuis le cache
 *    TanStack Query (aucune copie, aucun effet de synchronisation) ; elle n'est
 *    adoptée par le chat qu'au moment où l'utilisateur y envoie un message.
 *  Sélectionner A puis B ne peut donc jamais afficher un état mélangé : le fil
 *  rendu est une fonction pure de `selectedId` et du cache.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
} from 'lucide-react';
import AppLayout from '@/widgets/layout/AppLayout';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/shared/components/ui/Resizable';
import {
  persistedToChatMessages,
  useAssistantChat,
} from '@/features/assistant/hooks/useAssistantChat';
import {
  assistantKeys,
  useConversation,
} from '@/features/assistant/hooks/useConversations';
import ChatMessage from '@/features/assistant/components/ChatMessage';
import ChatComposer from '@/features/assistant/components/ChatComposer';
import ConversationSidebar from '@/features/assistant/components/ConversationSidebar';
import ConversationSkeleton from '@/features/assistant/components/ConversationSkeleton';
import AssistantHomeView from '@/features/assistant/components/AssistantHomeView';
import type { SendMessageOptions } from '@/features/assistant/types';
import { useEntitlements } from '@/features/entitlements/hooks/useEntitlements';
import AssistantQuotaExhausted from '@/features/entitlements/components/AssistantQuotaExhausted';

/** Suggestions affichées sur l'écran d'accueil (vide). */
const SUGGESTIONS = [
  'Quelles sont les conditions de validité d\'un contrat de travail à durée déterminée ?',
  'Comment constituer une SARL selon l\'Acte uniforme OHADA ?',
  'Quels sont les délais de préavis en cas de licenciement ?',
  'Quelles formalités pour enregistrer une sûreté mobilière (OHADA) ?',
];

export default function AssistantPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Conversation d'historique sélectionnée (null = conversation vivante).
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Incrémenté à chaque NAVIGATION (nouvelle conversation / changement de
  // conversation) pour réinitialiser le composer : ni les références épinglées
  // « @ » ni le mode ne doivent fuiter d'une conversation vers la suivante.
  const [composerResetSignal, setComposerResetSignal] = useState(0);

  // mibeko-front#7 : le composer cède la place au chemin vers Pro une fois
  // le quota épuisé, jamais recalculé localement. L'état « compté » (ce
  // qu'il reste) est désormais porté par l'indicateur permanent de la
  // coquille (Sidebar → QuotaIndicator, mibeko-front#8), pas ici — sinon
  // même répétition que celle déjà corrigée sur le Tableau de bord. Tant
  // que la requête charge, on se comporte comme si le quota était
  // disponible : ne jamais bloquer l'accès sur un état transitoire.
  const { data: entitlements } = useEntitlements();
  const assistantQuota = entitlements?.quotas.assistant;
  const isQuotaExhausted = !!assistantQuota && assistantQuota.used >= assistantQuota.limit;

  const scrollRef = useRef<HTMLDivElement>(null);

  const chat = useAssistantChat({
    onConversationCreated: () => {
      // Rafraîchit l'historique dès qu'une conversation est créée.
      queryClient.invalidateQueries({
        queryKey: [...assistantKeys.all, 'conversations'],
      });
    },
    onExchangeFinished: (conversationId) => {
      // L'échange a modifié la conversation : l'ordre/le titre de l'historique
      // et le détail en cache sont périmés.
      queryClient.invalidateQueries({
        queryKey: [...assistantKeys.all, 'conversations'],
      });
      if (conversationId) {
        queryClient.invalidateQueries({
          queryKey: assistantKeys.detail(conversationId),
        });
      }
    },
  });

  // Détail de la conversation d'historique sélectionnée (cache + refetch).
  const detailQuery = useConversation(selectedId);

  // La conversation sélectionnée est-elle celle que le chat porte déjà ?
  // (soit parce qu'on y a écrit — adoption —, soit aucune sélection : fil vivant)
  const isLiveSelected =
    selectedId === null || selectedId === chat.conversationId;

  // Messages d'historique prêts à afficher (et à servir de base à l'adoption).
  const historyMessages = useMemo(
    () =>
      detailQuery.data && detailQuery.data.id === selectedId
        ? persistedToChatMessages(detailQuery.data.messages)
        : [],
    [detailQuery.data, selectedId],
  );

  // Fil affiché : fonction pure de la sélection et du cache — jamais de copie.
  const displayedMessages = isLiveSelected ? chat.messages : historyMessages;
  const displayedId = selectedId ?? chat.conversationId;

  // États transitoires de la sélection (skeleton / erreur de chargement).
  const isLoadingSelection =
    !isLiveSelected && detailQuery.isPending && !detailQuery.isError;
  const showLoadError = !isLiveSelected && detailQuery.isError;

  // Pré-remplissage depuis ?q= (lien "Demander à l'IA" depuis la Bibliothèque).
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      chat.sendMessage(q);
      searchParams.delete('q');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll : saut instantané quand on change de conversation (pas
  // d'animation à travers deux contenus différents), fluide pendant le stream.
  const lastDisplayedIdRef = useRef<string | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const conversationChanged = lastDisplayedIdRef.current !== displayedId;
    lastDisplayedIdRef.current = displayedId;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: conversationChanged ? 'auto' : 'smooth',
    });
  }, [displayedMessages, displayedId]);

  const handleNew = () => {
    setSelectedId(null);
    setComposerResetSignal((s) => s + 1);
    chat.reset();
  };

  const handleSelect = (id: string) => {
    // Déjà affichée : rien à faire, sauf relancer un chargement en échec.
    if (id === displayedId) {
      if (detailQuery.isError) void detailQuery.refetch();
      return;
    }

    // Changer de conversation interrompt la génération en cours.
    if (chat.isStreaming) chat.stop();

    setSelectedId(id);
    // Nouvelle conversation à l'écran : le composer repart à zéro (références
    // épinglées + mode), sans contexte hérité de la précédente.
    setComposerResetSignal((s) => s + 1);
  };

  /**
   * Envoi d'un message. Depuis une conversation d'historique affichée en
   * lecture, le chat adopte d'abord ce fil (id + messages persistés) — la
   * cible est explicite, aucune fermeture périmée possible.
   */
  const handleSend = (text: string, options: SendMessageOptions = {}) => {
    if (!isLiveSelected && selectedId) {
      chat.sendMessage(text, {
        ...options,
        conversationId: selectedId,
        seedMessages: historyMessages,
      });
      return;
    }
    chat.sendMessage(text, options);
  };

  const isEmpty = displayedMessages.length === 0;

  return (
    <AppLayout space="app">
      <div className="flex h-full flex-col">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Panneau historique */}
          {sidebarOpen && (
            <>
              <ResizablePanel
                defaultSize={22}
                minSize={16}
                maxSize={34}
                className="hidden md:block"
              >
                <ConversationSidebar
                  activeId={displayedId}
                  loadingId={isLoadingSelection ? selectedId : null}
                  onSelect={handleSelect}
                  onNew={handleNew}
                />
              </ResizablePanel>
              <ResizableHandle className="hidden md:flex" />
            </>
          )}

          {/* Zone de chat */}
          <ResizablePanel defaultSize={78}>
            <div className="flex h-full flex-col">
              {/* En-tête */}
              <header className="flex shrink-0 items-center gap-3 border-b border-b1 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((v) => !v)}
                  title={sidebarOpen ? 'Masquer l\'historique' : 'Afficher l\'historique'}
                  className="hidden h-8 w-8 items-center justify-center rounded-md text-t3 transition-colors hover:bg-s2 hover:text-t1 md:flex"
                >
                  {sidebarOpen ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeftOpen className="h-4 w-4" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate font-display text-base font-semibold text-t1">
                    Assistant Mibeko IA
                  </h1>
                  <p className="truncate text-xs text-t3">
                    Recherche augmentée sur le droit congolais et l'espace OHADA
                  </p>
                </div>
              </header>

              {/* Fil de discussion */}
              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
                {isLoadingSelection ? (
                  <ConversationSkeleton />
                ) : showLoadError ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <AlertTriangle className="h-7 w-7 text-red" />
                    <div>
                      <p className="text-sm font-medium text-t1">
                        Impossible de charger cette conversation.
                      </p>
                      <p className="mt-1 text-xs text-t3">
                        Vérifiez votre connexion puis réessayez.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => detailQuery.refetch()}
                      className="flex items-center gap-1.5 rounded-lg border border-b1 bg-s1 px-3 py-1.5 text-xs font-medium text-t1 transition-colors hover:bg-s2"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Réessayer
                    </button>
                  </div>
                ) : isEmpty ? (
                  <AssistantHomeView
                    onAsk={(question) => handleSend(question)}
                    suggestions={SUGGESTIONS}
                  />
                ) : (
                  /* key = identité du fil affiché. Stable ('live') tant qu'on
                     écrit/streame — même quand une nouvelle conversation reçoit
                     son id en cours de route, pas de remontage qui ferait
                     clignoter la réponse. On ne remonte (et ré-anime) que sur
                     une vraie navigation vers une conversation d'historique. */
                  <div
                    key={isLiveSelected ? 'live' : selectedId}
                    className="mx-auto max-w-3xl animate-thread-in space-y-6 px-4 py-6"
                  >
                    {displayedMessages.map((message, i) => {
                      const isLast = i === displayedMessages.length - 1;
                      return (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          status={isLast && isLiveSelected ? chat.status : null}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Composer — cède la place au chemin vers Pro une fois le quota
                  épuisé (inactif, sinon, le temps de charger la conversation
                  cliquée). */}
              {isQuotaExhausted ? (
                <AssistantQuotaExhausted resetsAt={assistantQuota?.resets_at ?? null} />
              ) : (
                <ChatComposer
                  onSend={handleSend}
                  onStop={chat.stop}
                  isStreaming={chat.isStreaming}
                  disabled={isLoadingSelection || showLoadError}
                  resetSignal={composerResetSignal}
                />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </AppLayout>
  );
}

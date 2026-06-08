/**
 * Assistant.tsx — Espace "Assistant IA juridique" (Mibeko IA).
 *
 * Interface de chat professionnelle connectée au backend Laravel (agent RAG) :
 *  - streaming SSE avec effet machine à écrire ;
 *  - citations cliquables renvoyant vers la Bibliothèque ;
 *  - historique des conversations dans un panneau latéral redimensionnable.
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
import AppLayout from '@/shared/components/layout/AppLayout';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/shared/components/ui/Resizable';
import { useAssistantChat } from '@/features/assistant/hooks/useAssistantChat';
import {
  assistantKeys,
  useConversation,
} from '@/features/assistant/hooks/useConversations';
import ChatMessage from '@/features/assistant/components/ChatMessage';
import ChatComposer from '@/features/assistant/components/ChatComposer';
import ConversationSidebar from '@/features/assistant/components/ConversationSidebar';

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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const chat = useAssistantChat({
    onConversationCreated: () => {
      // Rafraîchit l'historique dès qu'une conversation est créée.
      queryClient.invalidateQueries({
        queryKey: [...assistantKeys.all, 'conversations'],
      });
    },
  });

  // Chargement d'une conversation sélectionnée dans l'historique.
  const { data: conversationDetail } = useConversation(selectedId);
  useEffect(() => {
    if (conversationDetail && selectedId) {
      chat.loadMessages(selectedId, conversationDetail.messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationDetail, selectedId]);

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

  // Auto-scroll vers le bas à chaque nouveau fragment.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [chat.messages]);

  const handleNew = () => {
    setSelectedId(null);
    chat.reset();
  };

  const handleSelect = (id: string) => {
    if (id === selectedId) return;
    setSelectedId(id);
  };

  const isEmpty = chat.messages.length === 0;

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
                  activeId={chat.conversationId}
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
                <div className="min-w-0">
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
                {isEmpty ? (
                  <div className="flex h-full flex-col items-center justify-center px-6">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10">
                      <Sparkles className="h-7 w-7 text-gold" />
                    </div>
                    <h2 className="font-display text-xl font-semibold text-t1">
                      Comment puis-je vous aider ?
                    </h2>
                    <p className="mt-1.5 max-w-md text-center text-sm text-t3">
                      Interrogez la base juridique Mibeko. Chaque réponse cite ses
                      sources officielles.
                    </p>

                    <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => chat.sendMessage(s)}
                          className="rounded-xl border border-b1 bg-s1 p-3 text-left text-xs leading-relaxed text-t2 transition-colors hover:border-gold/30 hover:bg-s2 hover:text-t1"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
                    {chat.messages.map((message, i) => {
                      const isLast = i === chat.messages.length - 1;
                      return (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          status={isLast ? chat.status : null}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Composer */}
              <ChatComposer
                onSend={chat.sendMessage}
                onStop={chat.stop}
                isStreaming={chat.isStreaming}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </AppLayout>
  );
}

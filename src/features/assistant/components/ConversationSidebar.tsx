/**
 * ConversationSidebar.tsx — Historique des conversations avec Mibeko IA.
 *
 * Permet de démarrer une nouvelle conversation, rechercher dans l'historique,
 * sélectionner, renommer (édition en ligne) et supprimer une conversation.
 */

import { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu';
import {
  useConversations,
  useDeleteConversation,
  useRenameConversation,
} from '@/features/assistant/hooks/useConversations';
import type { ConversationSummary } from '@/features/assistant/types';

interface ConversationSidebarProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export default function ConversationSidebar({
  activeId,
  onSelect,
  onNew,
}: ConversationSidebarProps) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const { data, isLoading } = useConversations({ title: search || undefined });
  const renameMutation = useRenameConversation();
  const deleteMutation = useDeleteConversation();

  const conversations = data?.data ?? [];

  const startEditing = (conv: ConversationSummary) => {
    setEditingId(conv.id);
    setDraftTitle(conv.title ?? '');
  };

  const confirmRename = (id: string) => {
    const title = draftTitle.trim();
    if (title) renameMutation.mutate({ id, title });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (id === activeId) onNew();
      },
    });
  };

  return (
    <div className="flex h-full flex-col bg-s1">
      {/* En-tête : nouvelle conversation */}
      <div className="shrink-0 p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-lg border border-gold/20 bg-gold/10 px-3 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/15"
        >
          <Plus className="h-4 w-4" />
          Nouvelle conversation
        </button>
      </div>

      {/* Recherche */}
      <div className="shrink-0 px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="h-8 w-full rounded-md border border-b1 bg-s2 pl-8 pr-2 text-xs text-t1 placeholder:text-t3 focus:outline-none focus:ring-1 focus:ring-gold/40"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-t4">
          Historique
        </div>

        {isLoading && (
          <div className="space-y-1 px-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-s2" />
            ))}
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-t3">
            Aucune conversation.
          </p>
        )}

        {conversations.map((conv) => {
          const isActive = conv.id === activeId;
          const isEditing = editingId === conv.id;

          if (isEditing) {
            return (
              <div
                key={conv.id}
                className="flex items-center gap-1 rounded-md bg-s2 px-2 py-1"
              >
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename(conv.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="h-7 flex-1 rounded bg-s3 px-2 text-xs text-t1 focus:outline-none focus:ring-1 focus:ring-gold/40"
                />
                <button
                  type="button"
                  onClick={() => confirmRename(conv.id)}
                  className="flex h-6 w-6 items-center justify-center rounded text-green hover:bg-s3"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="flex h-6 w-6 items-center justify-center rounded text-t3 hover:bg-s3"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          }

          return (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 rounded-md px-2 py-2 transition-colors ${
                isActive ? 'bg-s3' : 'hover:bg-s2'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(conv.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <MessageSquare
                  className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-gold' : 'text-t3'}`}
                />
                <span
                  className={`truncate text-xs ${isActive ? 'text-t1' : 'text-t2'}`}
                >
                  {conv.title || 'Sans titre'}
                </span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-t3 opacity-0 transition-opacity hover:bg-s4 hover:text-t1 focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    className="gap-2"
                    onClick={() => startEditing(conv)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Renommer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 text-red-400 focus:bg-red-400/10 focus:text-red-500"
                    onClick={() => handleDelete(conv.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    </div>
  );
}

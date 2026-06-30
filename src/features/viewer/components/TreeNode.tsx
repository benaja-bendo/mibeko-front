import React from 'react';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { useTreeMutations } from '@/features/viewer/context/treeMutations';
import type { TreeNode as TreeNodeType } from '@/shared/types/database';
import { cn } from '@/shared/lib/utils';
import { Target, History, Edit2, Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/Tooltip';

const TC: Record<string, { c: string; bg: string; bd: string; s: string }> = {
  TITRE:       { c: '#c8a86a', bg: 'rgba(200,168,106,.1)', bd: 'rgba(200,168,106,.2)', s: 'Tit.' },
  LIVRE:       { c: '#7a9ec4', bg: 'rgba(122,158,196,.1)', bd: 'rgba(122,158,196,.2)', s: 'Liv.' },
  PARTIE:      { c: '#8bb87a', bg: 'rgba(139,184,122,.1)', bd: 'rgba(139,184,122,.2)', s: 'Par.' },
  CHAPITRE:    { c: '#b87ab8', bg: 'rgba(184,122,184,.1)', bd: 'rgba(184,122,184,.2)', s: 'Chap.' },
  SECTION:     { c: '#c49a5a', bg: 'rgba(196,154,90,.1)', bd: 'rgba(196,154,90,.2)', s: 'Sect.' },
  SOUS_SECTION:{ c: '#7a9ec4', bg: 'rgba(122,158,196,.1)', bd: 'rgba(122,158,196,.2)', s: 'S-S.' },
  ARTICLE:     { c: '#7ab8b8', bg: 'rgba(122,184,184,.1)', bd: 'rgba(122,184,184,.2)', s: 'Art.' },
};

function getConfig(type: string) {
  return TC[type] || TC.ARTICLE;
}

function TreeNode({ node, depth, comfort = false }: { node: TreeNodeType; depth: number; comfort?: boolean }) {
  // Sélecteurs ciblés : un nœud ne se re-rend que lorsque SON propre état
  // (replié / sélectionné) change — et non à chaque mutation du store, ce qui
  // re-rendait inutilement les milliers de nœuds de l'arbre à chaque clic.
  const isCollapsed = useViewerStore((s) => s.collapsedNodes.has(node.id));
  const isSelected = useViewerStore((s) => s.selectedId === node.id);
  // Mise en évidence transitoire après « Localiser » (sélecteur ciblé : seul le
  // nœud concerné se re-rend, la virtualisation et la perf de l'arbre intactes).
  const isHighlighted = useViewerStore((s) => s.highlightedId === node.id);
  const toggleNode = useViewerStore((s) => s.toggleNode);
  const selectNode = useViewerStore((s) => s.selectNode);
  const openSidePanel = useViewerStore((s) => s.openSidePanel);
  const startSelection = useViewerStore((s) => s.startSelection);
  const setVersionModalOpen = useViewerStore((s) => s.setVersionModalOpen);
  const setAddElementModal = useViewerStore((s) => s.setAddElementModal);
  const setRenameModal = useViewerStore((s) => s.setRenameModal);
  const setDeleteModal = useViewerStore((s) => s.setDeleteModal);

  const { moveNode, updateArticle } = useTreeMutations();

  const [isDragging, setIsDragging] = React.useState(false);
  const [dropPosition, setDropPosition] = React.useState<'before' | 'inside' | 'after' | null>(null);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    const dragData = { id: node.id, type: node.type };
    const jsonData = JSON.stringify(dragData);

    // Set multiple formats for better compatibility
    e.dataTransfer.setData('application/json', jsonData);
    // Use a prefixed format in text/plain to store both ID and Type
    e.dataTransfer.setData('text/plain', `mibeko:${node.type}:${node.id}`);

    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragging(false);
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't allow dropping on itself
    if (isDragging) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const threshold = rect.height / 3;

    if (node.type === 'ARTICLE') {
      // Articles only allow before/after, not inside
      if (relativeY < rect.height / 2) {
        setDropPosition('before');
      } else {
        setDropPosition('after');
      }
    } else {
      if (relativeY < threshold) {
        setDropPosition('before');
      } else if (relativeY > rect.height - threshold) {
        setDropPosition('after');
      } else {
        setDropPosition('inside');
      }
    }

    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentDropPos = dropPosition;
    setDropPosition(null);

    try {
      let draggedId = '';
      let draggedType = 'NODE';

      // 1. Try application/json
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const data = JSON.parse(jsonData);
        draggedId = data.id;
        draggedType = data.type;
      }
      // 2. Try our custom text/plain format
      else {
        const textData = e.dataTransfer.getData('text/plain');
        if (textData && textData.startsWith('mibeko:')) {
          const parts = textData.split(':');
          draggedType = parts[1];
          draggedId = parts[2];
        } else {
          // 3. Last resort fallback to raw ID
          draggedId = textData;
        }
      }

      if (draggedId && draggedId !== node.id) {
        // Inside a node (reparenting)
        if (currentDropPos === 'inside' && node.type !== 'ARTICLE') {
          const nextOrder = (node.children?.length || 0);
          if (draggedType === 'ARTICLE') {
            updateArticle({
              id: draggedId,
              parent_node_id: node.id,
              ordre_affichage: nextOrder
            });
          } else {
            moveNode({
              id: draggedId,
              parent_id: node.id,
              sort_order: nextOrder
            });
          }
        }
        // Before or After a node (reordering)
        else if (currentDropPos === 'before' || currentDropPos === 'after') {
          const targetParentId = node.parent_id || null;
          const newOrder = currentDropPos === 'before' ? node.sort_order : node.sort_order + 1;

          if (draggedType === 'ARTICLE') {
            if (targetParentId) {
              updateArticle({
                id: draggedId,
                parent_node_id: targetParentId,
                ordre_affichage: newOrder
              });
            } else {
              console.warn('Cannot drop article at root level');
            }
          } else {
            moveNode({
              id: draggedId,
              parent_id: targetParentId,
              sort_order: newOrder
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse drop data', err);
    }
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextOrder = (node.children?.length || 0);
    setAddElementModal(true, node.id, 'CHILD', nextOrder);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameModal(true, node);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal(true, node);
  };

  const handleShowVersions = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(node.id, node);
    setVersionModalOpen(true);
  };

  const hasChildren = node.children && node.children.length > 0;
  const cfg = getConfig(node.type);

  return (
    <div
        onClick={() => selectNode(node.id, node)}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex items-center pr-1.5 cursor-pointer transition-all gap-[1px] border-l-2 border-transparent group relative",
          comfort ? "h-[34px]" : "h-[28px]",
          isSelected ? "bg-gold-d border-l-gold" : "hover:bg-s2",
          isHighlighted && "bg-gold/25 ring-2 ring-inset ring-gold animate-pulse z-10",
          dropPosition === 'inside' && "bg-gold/20 ring-1 ring-gold/50 rounded-sm",
          isDragging && "opacity-40 grayscale"
        )}
        style={{ paddingLeft: `${depth * 20 + 4}px` }}
      >
        {/* Drop indicator: Before */}
        {dropPosition === 'before' && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold z-20 animate-pulse shadow-[0_0_8px_rgba(200,168,106,0.8)]" />
        )}

        {/* Drop indicator: After */}
        {dropPosition === 'after' && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold z-20 animate-pulse shadow-[0_0_8px_rgba(200,168,106,0.8)]" />
        )}

        {/* Toggle */}
        <div
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              toggleNode(node.id);
            }
          }}
          className={cn(
            "w-4 h-4 flex items-center justify-center shrink-0 text-t3 transition-transform",
            !hasChildren && "invisible"
          )}
        >
          {isCollapsed ? <ChevronRight className="w-[11px] h-[11px]" strokeWidth={2.5} /> : <ChevronDown className="w-[11px] h-[11px]" strokeWidth={2.5} />}
        </div>

        <div className="w-1.5 h-1.5 rounded-full shrink-0 mx-[3px]" style={{ background: cfg.c }} />

        <span
          className="text-[8.5px] font-mono tracking-[0.04em] px-[5px] py-[1px] rounded-[3px] shrink-0 uppercase font-semibold"
          style={{ background: cfg.bg, color: cfg.c, border: `1px solid ${cfg.bd}` }}
        >
          {cfg.s}
        </span>

        <span className={cn("font-mono text-t3 mr-[3px] shrink-0", comfort ? "text-[11px]" : "text-[9.5px]")}>
          {node.numero}
        </span>

        <span className={cn("flex-1 text-t1 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-2", comfort ? "text-[13.5px]" : "text-[12px]")}>
          <span>{node.label}</span>
          {node.content && (
            <span className="text-[10.5px] text-t3 italic font-serif opacity-50 font-normal truncate max-w-[200px]">
              {node.content.replace(/\n/g, ' ').substring(0, 60)}...
            </span>
          )}
        </span>

        {/* Validation Status — pour un article, ce badge ouvre le panneau de détails */}
        {(() => {
          const vsClass = node.vs === 'ok'
            ? "bg-green-d text-green border-[rgba(86,160,122,.2)]"
            : node.vs === 'err'
              ? "bg-red-d text-red border-[rgba(196,97,78,.2)]"
              : "bg-amber-d text-amber border-[rgba(196,144,58,.2)]";
          const vsSymbol = node.vs === 'ok' ? '✓' : node.vs === 'err' ? '✗' : '~';

          if (node.type !== 'ARTICLE') {
            return <span className={cn("text-[8.5px] font-mono px-1 py-[1px] rounded-[3px] shrink-0 ml-[2px] border", vsClass)}>{vsSymbol}</span>;
          }

          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); openSidePanel(node); }}
                  className={cn(
                    "text-[8.5px] font-mono px-1 py-[1px] rounded-[3px] shrink-0 ml-[2px] border cursor-pointer transition-all hover:scale-110 hover:ring-1 hover:ring-gold/50",
                    vsClass
                  )}
                >
                  {vsSymbol}
                </button>
              </TooltipTrigger>
              <TooltipContent>Ouvrir le panneau de l'article</TooltipContent>
            </Tooltip>
          );
        })()}

        {/* Actions (visible on hover) */}
        <div className="hidden group-hover:flex items-center gap-0 ml-[1px]">
          {node.type === 'ARTICLE' && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); startSelection(node); }}
                    className="w-5 h-5 rounded bg-transparent border-none text-t3 cursor-pointer flex items-center justify-center transition-all hover:bg-gold-d hover:text-gold"
                  >
                    <Target className="w-3 h-3 pointer-events-none" strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Localiser dans le PDF</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleShowVersions}
                    className="w-5 h-5 rounded bg-transparent border-none text-t3 cursor-pointer flex items-center justify-center transition-all hover:bg-purple-d hover:text-purple"
                  >
                    <History className="w-3 h-3 pointer-events-none" strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Historique des versions</TooltipContent>
              </Tooltip>
            </>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleRename}
                className="w-5 h-5 rounded bg-transparent border-none text-t3 cursor-pointer flex items-center justify-center transition-all hover:bg-s4 hover:text-t2"
              >
                <Edit2 className="w-3 h-3 pointer-events-none" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Modifier l'élément</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleAddChild}
                className="w-5 h-5 rounded bg-transparent border-none text-t3 cursor-pointer flex items-center justify-center transition-all hover:bg-s4 hover:text-t2"
              >
                <Plus className="w-3 h-3 pointer-events-none" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Ajouter un sous-élément</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleDelete}
                className="w-5 h-5 rounded bg-transparent border-none text-t3 cursor-pointer flex items-center justify-center transition-all hover:bg-red-d hover:text-red"
              >
                <Trash2 className="w-3 h-3 pointer-events-none" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Supprimer l'élément</TooltipContent>
          </Tooltip>
        </div>
      </div>
  );
}

// Memoïsé : combiné aux sélecteurs ciblés du store, un nœud ne se re-rend que
// si son `node` change, ce qui coupe l'effet de cascade sur tout l'arbre.
export default React.memo(TreeNode);

import React from 'react';
import { useParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';
import { TreeMutationsContext } from '@/features/viewer/context/treeMutations';
import { cn } from '@/shared/lib/utils';
import type { TreeNode as TreeNodeType } from '@/shared/types/database';
import { FolderTree, Search, FoldVertical, UnfoldVertical, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/Tooltip';
import TreeNode from './TreeNode.tsx';

/** Hauteur fixe d'une ligne d'arbre (doit rester synchro avec `h-[28px]` dans TreeNode). */
const ROW_HEIGHT = 28;

interface FlatRow {
  node: TreeNodeType;
  depth: number;
}

/**
 * Aplatit l'arbre en la seule liste des lignes *visibles* (on n'entre pas dans
 * un nœud replié), avec leur profondeur. C'est cette liste plate que la
 * virtualisation parcourt : on ne monte dans le DOM que les ~30 lignes à
 * l'écran au lieu des milliers de nœuds du document.
 */
function flattenVisible(nodes: TreeNodeType[], collapsed: Set<string>, depth = 0, acc: FlatRow[] = []): FlatRow[] {
  for (const node of nodes) {
    acc.push({ node, depth });
    if (node.children && node.children.length > 0 && !collapsed.has(node.id)) {
      flattenVisible(node.children, collapsed, depth + 1, acc);
    }
  }
  return acc;
}

/** Un nœud correspond à la recherche par son numéro, son libellé ou son contenu. */
function nodeMatches(node: TreeNodeType, q: string): boolean {
  const haystack = `${node.numero ?? ''} ${node.label ?? ''} ${node.content ?? ''}`.toLowerCase();
  return haystack.includes(q);
}

/**
 * Aplatit en ne gardant que les nœuds qui correspondent OU qui ont un descendant
 * correspondant — en dépliant systématiquement les branches retenues (on ignore
 * l'état replié pendant une recherche, pour que les résultats soient visibles).
 */
function flattenSearch(nodes: TreeNodeType[], q: string, depth = 0, acc: FlatRow[] = []): boolean {
  let matchedHere = false;
  for (const node of nodes) {
    const childAcc: FlatRow[] = [];
    const childMatched = node.children?.length ? flattenSearch(node.children, q, depth + 1, childAcc) : false;
    if (nodeMatches(node, q) || childMatched) {
      acc.push({ node, depth });
      acc.push(...childAcc);
      matchedHere = true;
    }
  }
  return matchedHere;
}

export default function TreeView({ treeData }: { treeData: TreeNodeType[] }) {
  const { id: documentId } = useParams<{ id: string }>();
  const searchQuery = useViewerStore((s) => s.searchQuery);
  const setSearchQuery = useViewerStore((s) => s.setSearchQuery);
  const collapseAll = useViewerStore((s) => s.collapseAll);
  const expandAll = useViewerStore((s) => s.expandAll);
  const setAddElementModal = useViewerStore((s) => s.setAddElementModal);
  const collapsedNodes = useViewerStore((s) => s.collapsedNodes);
  const comfortMode = useViewerStore((s) => s.comfortMode);
  const toggleComfort = useViewerStore((s) => s.toggleComfort);
  const { moveNode, updateArticle } = useDocumentMutations(documentId || '');
  const [isDragOver, setIsDragOver] = React.useState(false);

  // Contexte de mutations partagé avec les TreeNode : on n'expose que les
  // fonctions `mutate` (stables) pour garder une valeur de contexte constante.
  const treeMutations = React.useMemo(
    () => ({ moveNode: moveNode.mutate, updateArticle: updateArticle.mutate }),
    [moveNode.mutate, updateArticle.mutate],
  );

  // Liste plate des lignes : en recherche, on filtre (et déplie) les branches
  // correspondantes ; sinon on respecte l'état replié/déplié.
  const flatRows = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return flattenVisible(treeData, collapsedNodes);
    const acc: FlatRow[] = [];
    flattenSearch(treeData, q, 0, acc);
    return acc;
  }, [treeData, collapsedNodes, searchQuery]);

  // Hauteur de ligne selon la densité (estimate ET hauteur réelle du TreeNode
  // dérivent de la MÊME valeur → alignement garanti après bascule).
  const rowHeight = comfortMode ? 34 : ROW_HEIGHT;

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  // Re-mesure quand la densité change (sinon les positions gardent l'ancienne taille).
  React.useEffect(() => {
    rowVirtualizer.measure();
  }, [rowHeight, rowVirtualizer]);

  const handleCollapseAll = () => collapseAll(treeData);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
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
          draggedId = textData;
        }
      }

      if (draggedId && draggedType !== 'ARTICLE') {
        console.log(`Root Drop Action: Dragged ${draggedId} (${draggedType}) -> root`);
        moveNode.mutate({
          id: draggedId,
          parent_id: null,
          sort_order: treeData.length
        });
      } else if (draggedType === 'ARTICLE') {
        console.warn('Cannot drop article at root level');
      }
    } catch (err) {
      console.error('Failed to parse root drop', err);
    }
  };

  const handleAddRoot = () => {
    setAddElementModal(true, null, 'ROOT', treeData.length);
  };

  // Helper to count total nodes recursively
  const countNodes = (nodes: TreeNodeType[]): number => {
    return nodes.reduce((acc, n) => acc + 1 + (n.children ? countNodes(n.children) : 0), 0);
  };
  const totalElements = countNodes(treeData);

  return (
    // Le masquage mobile est géré par le conteneur (ResizablePanel hidden md:block) ;
    // ce composant doit rester visible dans le drawer structure mobile.
    <div className="flex flex-col h-full shrink-0 w-full">
      {/* Header */}
      <div className="h-[38px] bg-s1 border-b border-b1 flex items-center px-3 gap-1.5 shrink-0">
        <FolderTree className="w-[13px] h-[13px] text-t3" strokeWidth={2} />
        <span className="text-[10px] font-semibold tracking-[0.09em] uppercase text-t3 font-mono flex-1">
          Structure
        </span>
        <span className="text-[9.5px] font-mono text-t3 bg-s3 px-1.5 py-[1px] rounded-[3px]">
          {totalElements} éléments
        </span>
      </div>

      {/* Toolbar */}
      <div className="h-[34px] bg-s1 border-b border-b1 flex items-center px-2 gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCollapseAll}
              className="h-[24px] px-2"
            >
              <FoldVertical className="w-3 h-3" />
              <span className="ml-1.5">Replier</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tout replier</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
              className="h-[24px] px-2"
            >
              <UnfoldVertical className="w-3 h-3" />
              <span className="ml-1.5">Déplier</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tout déplier</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleComfort}
              className={cn('h-[24px] px-2', comfortMode && 'border-gold/40 text-gold')}
            >
              <span className={comfortMode ? 'text-[13px] leading-none' : 'text-[10px] leading-none'}>Aa</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{comfortMode ? 'Densité compacte' : 'Densité confort (texte plus grand)'}</TooltipContent>
        </Tooltip>

        <div className="w-px h-[16px] bg-b2 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="gold"
              size="sm"
              onClick={handleAddRoot}
              className="h-[24px] px-2"
            >
              <Plus className="w-3 h-3" />
              <span className="ml-1.5">Ajouter</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ajouter un titre à la racine</TooltipContent>
        </Tooltip>

        <div className="flex-1 relative ml-1">
          <Search className="absolute left-[7px] top-1/2 -translate-y-1/2 w-[12px] h-[12px] text-t3 pointer-events-none" strokeWidth={2} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[24px] bg-s2 border border-b1 rounded text-t1 text-[11.5px] font-body pl-[25px] pr-2 outline-none transition-colors focus:border-b3 placeholder:text-t3"
          />
        </div>
      </div>

      {/* Tree Content — virtualisé : seules les lignes visibles sont montées */}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto py-1 custom-scrollbar bg-bg transition-colors",
          isDragOver && "bg-gold/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <TreeMutationsContext.Provider value={treeMutations}>
          {flatRows.length === 0 && searchQuery.trim() && (
            <div className="px-3 py-6 text-center text-[11px] font-mono text-t3">
              Aucun élément ne correspond à « {searchQuery.trim()} ».
            </div>
          )}
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const { node, depth } = flatRows[virtualRow.index];
              return (
                <div
                  key={node.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TreeNode node={node} depth={depth} comfort={comfortMode} />
                </div>
              );
            })}
          </div>
        </TreeMutationsContext.Provider>
      </div>
    </div>
  );
}

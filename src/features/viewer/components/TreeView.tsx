import React from 'react';
import { useParams } from 'react-router-dom';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';
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

export default function TreeView({ treeData }: { treeData: TreeNodeType[] }) {
  const { id: documentId } = useParams<{ id: string }>();
  const { leftPanelWidth, searchQuery, setSearchQuery, collapseAll, expandAll, setAddElementModal } = useViewerStore();
  const { moveNode } = useDocumentMutations(documentId || '');
  const [isDragOver, setIsDragOver] = React.useState(false);

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
    <div className="hidden md:flex flex-col h-full shrink-0" style={{ width: leftPanelWidth }}>
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

      {/* Tree Content */}
      <div
        className={cn(
          "flex-1 overflow-y-auto py-1 custom-scrollbar bg-[#0a0a0b] transition-colors",
          isDragOver && "bg-gold/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {treeData.map((node) => (
          <TreeNode key={node.id} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
}

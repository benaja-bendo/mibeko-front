import { create } from 'zustand';
import type { TreeNode } from '@/shared/types/database';

interface ViewerState {
  // Tree state
  collapsedNodes: Set<string>;
  toggleNode: (id: string) => void;
  collapseAll: (nodes: TreeNode[]) => void;
  expandAll: () => void;

  // Selection state
  selectedId: string | null;
  selectedNode: TreeNode | null;
  selectNode: (id: string, node: TreeNode) => void;

  // Search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Splitter state
  leftPanelWidth: number;
  setLeftPanelWidth: (width: number) => void;

  // PDF Viewer state
  pdfZoom: number;
  setPdfZoom: (zoom: number | ((z: number) => number)) => void;
  pdfPage: number;
  setPdfPage: (page: number) => void;

  // Selection mode on PDF
  selectionMode: boolean;
  selectionTarget: TreeNode | null;
  startSelection: (node: TreeNode) => void;
  stopSelection: () => void;

  // Side panel state
  sidePanelOpen: boolean;
  activeTab: 'content' | 'versions' | 'meta';
  openSidePanel: (node: TreeNode) => void;
  closeSidePanel: () => void;
  setActiveTab: (tab: 'content' | 'versions' | 'meta') => void;

  // Version Modal
  versionModalOpen: boolean;
  setVersionModalOpen: (open: boolean) => void;
  versionFilter: 'all' | 'creation' | 'modification' | 'pending';
  setVersionFilter: (filter: 'all' | 'creation' | 'modification' | 'pending') => void;

  // Add Element Modal
  addElementModalOpen: boolean;
  addElementParentId: string | null;
  addElementType: 'ROOT' | 'CHILD';
  addElementSortOrder: number;
  setAddElementModal: (open: boolean, parentId?: string | null, type?: 'ROOT' | 'CHILD', sortOrder?: number) => void;

  // Rename Modal
  renameModalOpen: boolean;
  renameNode: TreeNode | null;
  setRenameModal: (open: boolean, node?: TreeNode | null) => void;

  // Delete Modal
  deleteModalOpen: boolean;
  deleteNode: TreeNode | { id: string; type: 'DOCUMENT'; content: string | null | undefined } | null;
  setDeleteModal: (open: boolean, node?: TreeNode | { id: string; type: 'DOCUMENT'; content: string | null | undefined } | null) => void;

  // Info Modal
  infoModalOpen: boolean;
  setInfoModalOpen: (open: boolean) => void;

  // Edit Document Modal (métadonnées : titre, NOR, dates, statuts…)
  editDocModalOpen: boolean;
  setEditDocModalOpen: (open: boolean) => void;

  // Publish Modal (workflow curation_status)
  publishModalOpen: boolean;
  setPublishModalOpen: (open: boolean) => void;

  // Drawer structure (arborescence) sur mobile
  structureDrawerOpen: boolean;
  setStructureDrawerOpen: (open: boolean) => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  collapsedNodes: new Set(),
  // ... existing methods (toggleNode, collapseAll, expandAll)
  toggleNode: (id) => set((state) => {
    const newSet = new Set(state.collapsedNodes);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    return { collapsedNodes: newSet };
  }),
  collapseAll: (nodes) => {
    const ids = new Set<string>();
    const flatten = (ns: TreeNode[]) => {
      ns.forEach(n => {
        if (n.children && n.children.length > 0) {
          ids.add(n.id);
          flatten(n.children);
        }
      });
    };
    flatten(nodes);
    set({ collapsedNodes: ids });
  },
  expandAll: () => set({ collapsedNodes: new Set() }),

  selectedId: null,
  selectedNode: null,
  // Sélectionne sans ouvrir le panneau latéral : l'ouverture est un geste
  // explicite (badge de statut dans l'arbre ou openSidePanel). Referme le
  // drawer structure mobile pour révéler le PDF localisé.
  selectNode: (id, node) => set({
    selectedId: id,
    selectedNode: node,
    activeTab: 'content',
    structureDrawerOpen: false
  }),

  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  leftPanelWidth: 400,
  setLeftPanelWidth: (leftPanelWidth) => set({ leftPanelWidth }),

  pdfZoom: 1,
  setPdfZoom: (zoom) => set((state) => ({
    pdfZoom: typeof zoom === 'function' ? zoom(state.pdfZoom) : zoom
  })),
  pdfPage: 1,
  setPdfPage: (pdfPage) => set({ pdfPage }),

  selectionMode: false,
  selectionTarget: null,
  startSelection: (node) => set({ selectionMode: true, selectionTarget: node, sidePanelOpen: false }),
  stopSelection: () => set({ selectionMode: false, selectionTarget: null }),

  sidePanelOpen: false,
  activeTab: 'content',
  openSidePanel: (node) => set({ sidePanelOpen: true, selectedId: node.id, selectedNode: node, structureDrawerOpen: false }),
  closeSidePanel: () => set({ sidePanelOpen: false }),
  setActiveTab: (activeTab) => set({ activeTab }),

  versionModalOpen: false,
  setVersionModalOpen: (versionModalOpen) => set({ versionModalOpen }),
  versionFilter: 'all',
  setVersionFilter: (versionFilter) => set({ versionFilter }),

  addElementModalOpen: false,
  addElementParentId: null,
  addElementType: 'ROOT',
  addElementSortOrder: 0,
  setAddElementModal: (open, parentId = null, type = 'ROOT', sortOrder = 0) => set({
    addElementModalOpen: open,
    addElementParentId: parentId,
    addElementType: type,
    addElementSortOrder: sortOrder
  }),

  renameModalOpen: false,
  renameNode: null,
  setRenameModal: (open, node = null) => set({
    renameModalOpen: open,
    renameNode: node
  }),

  deleteModalOpen: false,
  deleteNode: null,
  setDeleteModal: (open, node = null) => set({
    deleteModalOpen: open,
    deleteNode: node
  }),

  infoModalOpen: false,
  setInfoModalOpen: (open) => set({ infoModalOpen: open }),

  editDocModalOpen: false,
  setEditDocModalOpen: (open) => set({ editDocModalOpen: open }),

  publishModalOpen: false,
  setPublishModalOpen: (open) => set({ publishModalOpen: open }),

  structureDrawerOpen: false,
  setStructureDrawerOpen: (open) => set({ structureDrawerOpen: open }),
}));

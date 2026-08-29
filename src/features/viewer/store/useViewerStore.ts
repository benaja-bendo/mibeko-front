import { create } from 'zustand';
import type { TreeNode } from '@/shared/types/database';

// Épinglage du panneau article : préférence d'OUTIL (pas un état de document),
// conservée d'une session à l'autre. Lue/écrite à la main plutôt qu'avec le
// middleware `persist` de zustand : celui-ci sérialiserait tout le store, or
// `collapsedNodes` est un Set que JSON.stringify réduit silencieusement à `{}`.
const PIN_STORAGE_KEY = 'mibeko_viewer_side_panel_pinned';

const readPinned = (): boolean => {
  try {
    return localStorage.getItem(PIN_STORAGE_KEY) === 'true';
  } catch {
    // Stockage indisponible (navigation privée, quota) : l'épingle vaut alors
    // pour la session seulement — pas de raison de casser le viewer pour ça.
    return false;
  }
};

const writePinned = (value: boolean) => {
  try {
    localStorage.setItem(PIN_STORAGE_KEY, String(value));
  } catch {
    /* voir readPinned */
  }
};

interface ViewerState {
  // Tree state
  collapsedNodes: Set<string>;
  toggleNode: (id: string) => void;
  collapseAll: (nodes: TreeNode[]) => void;
  expandAll: () => void;
  // Déplie une liste d'ancêtres (les retire de `collapsedNodes`) pour révéler
  // une branche repliée — utilisé par « Localiser » depuis les anomalies.
  expandNodes: (ids: string[]) => void;

  // Selection state
  selectedId: string | null;
  selectedNode: TreeNode | null;
  selectNode: (id: string, node: TreeNode) => void;

  // « Localiser » dans l'arbre : surlignage transitoire d'un nœud + ticket de
  // défilement consommé par TreeView (le `nonce` re-déclenche même cible).
  highlightedId: string | null;
  locateId: string | null;
  locateNonce: number;
  revealNode: (id: string) => void;
  clearHighlight: () => void;

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
  // Épinglé : la colonne article reste réservée même sans article sélectionné
  // (desktop uniquement — voir SidePanel/Viewer).
  sidePanelPinned: boolean;
  toggleSidePanelPinned: () => void;
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

  // Dossier de travail (export → correction externe → dépôt → arbitrage)
  workFileModalOpen: boolean;
  setWorkFileModalOpen: (open: boolean) => void;

  // Panneau des anomalies de curation (vue Contrôle / validation humaine)
  anomaliesPanelOpen: boolean;
  setAnomaliesPanel: (open: boolean) => void;

  // Densité d'affichage de l'arbre : compact (défaut) ou confort (texte plus
  // grand, lignes plus hautes) pour les longues sessions de relecture.
  comfortMode: boolean;
  toggleComfort: () => void;

  // Drawer structure (arborescence) sur mobile
  structureDrawerOpen: boolean;
  setStructureDrawerOpen: (open: boolean) => void;

  // Réinitialise l'état PROPRE À UN DOCUMENT au changement de `documentId`.
  // Le store est un singleton qui survit à la navigation SPA : sans ça, la page
  // PDF, le zoom, la sélection, les replis… « fuient » d'un document à l'autre.
  // Les préférences UI globales (largeur de panneau, mode confort) sont conservées.
  resetForDocument: () => void;
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
  expandNodes: (ids) => set((state) => {
    if (ids.length === 0) return {};
    const next = new Set(state.collapsedNodes);
    let changed = false;
    ids.forEach((id) => { if (next.delete(id)) changed = true; });
    return changed ? { collapsedNodes: next } : {};
  }),

  selectedId: null,
  selectedNode: null,
  highlightedId: null,
  locateId: null,
  locateNonce: 0,
  // Demande à l'arbre de défiler vers `id` et de le surligner. `locateNonce`
  // change à chaque appel pour re-déclencher l'effet même sur la même cible.
  revealNode: (id) => set((state) => ({ highlightedId: id, locateId: id, locateNonce: state.locateNonce + 1 })),
  clearHighlight: () => set({ highlightedId: null }),
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
  sidePanelPinned: readPinned(),
  toggleSidePanelPinned: () => set((s) => {
    const next = !s.sidePanelPinned;
    writePinned(next);
    // Épingler ouvre le panneau dans la foulée : épingler une colonne fermée
    // n'aurait aucun effet visible.
    return { sidePanelPinned: next, sidePanelOpen: next ? true : s.sidePanelOpen };
  }),
  activeTab: 'content',
  // Le panneau article (bord droit) et le panneau anomalies (bord bas) occupent
  // des bords différents : ils coexistent sans se chevaucher.
  openSidePanel: (node) => set({ sidePanelOpen: true, selectedId: node.id, selectedNode: node, structureDrawerOpen: false }),
  // Fermer désépingle aussi : sinon la colonne resterait réservée alors que
  // l'utilisateur vient de demander à la faire disparaître (bouton sans effet).
  closeSidePanel: () => {
    writePinned(false);
    set({ sidePanelOpen: false, sidePanelPinned: false });
  },
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

  workFileModalOpen: false,
  setWorkFileModalOpen: (open) => set({ workFileModalOpen: open }),

  anomaliesPanelOpen: false,
  setAnomaliesPanel: (open) => set({ anomaliesPanelOpen: open }),

  comfortMode: false,
  toggleComfort: () => set((s) => ({ comfortMode: !s.comfortMode })),

  structureDrawerOpen: false,
  setStructureDrawerOpen: (open) => set({ structureDrawerOpen: open }),

  resetForDocument: () => set({
    collapsedNodes: new Set(),
    selectedId: null,
    selectedNode: null,
    highlightedId: null,
    locateId: null,
    searchQuery: '',
    pdfZoom: 1,
    pdfPage: 1,
    selectionMode: false,
    selectionTarget: null,
    sidePanelOpen: false,
    activeTab: 'content',
    anomaliesPanelOpen: false,
    structureDrawerOpen: false,
  }),
}));

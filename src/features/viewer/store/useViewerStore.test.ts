import { useViewerStore } from './useViewerStore';

function resetViewerStore() {
  useViewerStore.setState({
    collapsedNodes: new Set(),
    selectedId: null,
    selectedNode: null,
    searchQuery: '',
    leftPanelWidth: 400,
    pdfZoom: 1,
    pdfPage: 1,
    selectionMode: false,
    selectionTarget: null,
    sidePanelOpen: false,
    activeTab: 'content',
    versionModalOpen: false,
    versionFilter: 'all',
    addElementModalOpen: false,
    addElementParentId: null,
    addElementType: 'ROOT',
    addElementSortOrder: 0,
    renameModalOpen: false,
    renameNode: null,
    deleteModalOpen: false,
    deleteNode: null,
  });
}

describe('useViewerStore', () => {
  afterEach(() => resetViewerStore());

  it('toggleNode ajoute puis retire un id', () => {
    useViewerStore.getState().toggleNode('n1');
    expect(useViewerStore.getState().collapsedNodes.has('n1')).toBe(true);

    useViewerStore.getState().toggleNode('n1');
    expect(useViewerStore.getState().collapsedNodes.has('n1')).toBe(false);
  });

  it('selectNode sélectionne sans ouvrir le side panel (ouverture explicite via le badge)', () => {
    useViewerStore.getState().selectNode('a1', {
      id: 'a1',
      type: 'ARTICLE',
      numero: '1',
      label: 'Article 1',
      sort_order: 1,
      vs: 'ok',
    });

    expect(useViewerStore.getState().selectedId).toBe('a1');
    expect(useViewerStore.getState().sidePanelOpen).toBe(false);
    expect(useViewerStore.getState().activeTab).toBe('content');
  });

  it('openSidePanel ouvre le panneau et synchronise la sélection', () => {
    const node = {
      id: 'a2',
      type: 'ARTICLE',
      numero: '2',
      label: 'Article 2',
      sort_order: 2,
      vs: 'pend',
    } as const;

    useViewerStore.getState().openSidePanel(node);

    expect(useViewerStore.getState().sidePanelOpen).toBe(true);
    expect(useViewerStore.getState().selectedId).toBe('a2');
    expect(useViewerStore.getState().selectedNode?.id).toBe('a2');
  });
});

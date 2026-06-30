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

  it('expandNodes retire les ancêtres de collapsedNodes (déplie la branche)', () => {
    useViewerStore.setState({ collapsedNodes: new Set(['p1', 'p2', 'autre']) });

    useViewerStore.getState().expandNodes(['p1', 'p2']);

    const collapsed = useViewerStore.getState().collapsedNodes;
    expect(collapsed.has('p1')).toBe(false);
    expect(collapsed.has('p2')).toBe(false);
    // Les autres nœuds repliés ne sont pas touchés.
    expect(collapsed.has('autre')).toBe(true);
  });

  it('revealNode pose le surlignage et incrémente le nonce de défilement', () => {
    const before = useViewerStore.getState().locateNonce;

    useViewerStore.getState().revealNode('a9');

    expect(useViewerStore.getState().highlightedId).toBe('a9');
    expect(useViewerStore.getState().locateId).toBe('a9');
    expect(useViewerStore.getState().locateNonce).toBe(before + 1);

    // Re-localiser la même cible re-déclenche (nonce qui change).
    useViewerStore.getState().revealNode('a9');
    expect(useViewerStore.getState().locateNonce).toBe(before + 2);
  });

  it('resetForDocument remet à zéro l’état propre au document (anti-fuite entre documents)', () => {
    // État « document A » : page PDF 7, zoom modifié, sélection, replis, surlignage.
    useViewerStore.setState({
      pdfPage: 7,
      pdfZoom: 1.8,
      collapsedNodes: new Set(['p1']),
      selectedId: 'a1',
      selectedNode: { id: 'a1', type: 'ARTICLE', numero: '1', label: 'Art 1', sort_order: 1, vs: 'ok' },
      highlightedId: 'a1',
      locateId: 'a1',
      searchQuery: 'foo',
      sidePanelOpen: true,
      anomaliesPanelOpen: true,
      leftPanelWidth: 520,
    });

    useViewerStore.getState().resetForDocument();
    const s = useViewerStore.getState();

    // Réinitialisé au document suivant…
    expect(s.pdfPage).toBe(1);
    expect(s.pdfZoom).toBe(1);
    expect(s.collapsedNodes.size).toBe(0);
    expect(s.selectedId).toBeNull();
    expect(s.selectedNode).toBeNull();
    expect(s.highlightedId).toBeNull();
    expect(s.locateId).toBeNull();
    expect(s.searchQuery).toBe('');
    expect(s.sidePanelOpen).toBe(false);
    expect(s.anomaliesPanelOpen).toBe(false);
    // …mais les préférences UI globales sont conservées.
    expect(s.leftPanelWidth).toBe(520);
  });
});

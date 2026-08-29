import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDocumentData } from '@/features/documents/hooks/useDocumentData';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import Topbar from '@/features/viewer/components/Topbar';
import TreeView from '@/features/viewer/components/TreeView';
import PdfViewer from '@/features/viewer/components/PdfViewer';
import SidePanel from '@/features/viewer/components/SidePanel';
import VersionModal from '@/features/viewer/components/VersionModal';
import AddElementModal from '@/features/viewer/components/AddElementModal';
import RenameNodeModal from '@/features/viewer/components/RenameNodeModal';
import DeleteConfirmModal from '@/features/viewer/components/DeleteConfirmModal';
import DocumentInfoModal from '@/features/viewer/components/DocumentInfoModal';
import EditDocumentModal from '@/features/viewer/components/EditDocumentModal';
import PublishModal from '@/features/viewer/components/PublishModal';
import WorkFileModal from '@/features/viewer/components/WorkFileModal';
import AnomaliesPanel from '@/features/viewer/components/AnomaliesPanel';
import Toaster from '@/shared/components/ui/Toaster';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/components/ui/Resizable';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/shared/components/ui/Sheet';
import { useIsDesktop } from '@/shared/hooks/useMediaQuery';

export default function Viewer() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useDocumentData(id || '');
  const { structureDrawerOpen, setStructureDrawerOpen } = useViewerStore();
  const resetForDocument = useViewerStore((s) => s.resetForDocument);
  const sidePanelOpen = useViewerStore((s) => s.sidePanelOpen);
  const sidePanelPinned = useViewerStore((s) => s.sidePanelPinned);

  // Trois colonnes (structure · PDF · article) seulement à partir de 1024px :
  // en dessous, le panneau article reste un recouvrement plein écran, faute de
  // largeur pour que les trois restent lisibles. Épinglé, il garde sa colonne
  // même sans article sélectionné.
  const isDesktop = useIsDesktop();
  const showArticleColumn = isDesktop && (sidePanelOpen || sidePanelPinned);

  // Le store du viewer est un singleton qui survit à la navigation SPA : on
  // réinitialise l'état propre au document (page PDF, zoom, sélection, replis…)
  // à chaque changement d'`id`, sinon il « fuit » d'un document à l'autre.
  useEffect(() => {
    resetForDocument();
  }, [id, resetForDocument]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-bg text-gold font-mono text-sm tracking-widest uppercase">
        <svg viewBox="0 0 24 24" className="w-8 h-8 animate-spin mb-4 stroke-current fill-none stroke-2">
          <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
          <path d="M12 3a9 9 0 0 1 9 9" />
        </svg>
        Chargement du document...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-bg text-red font-mono text-sm tracking-widest uppercase">
        Erreur lors du chargement du document.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-t1 font-body">
      <Topbar document={data.document} />

      <div className="flex-1 flex overflow-hidden relative">
        {/* `id`+`order` sont requis par react-resizable-panels dès qu'un panneau
            est conditionnel : sans eux, la colonne article apparaissant en cours
            de session ferait perdre à la bibliothèque le suivi des tailles. */}
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel id="tree" order={1} defaultSize={20} minSize={15} maxSize={40} className="hidden md:block">
            <TreeView treeData={data.tree} />
          </ResizablePanel>

          <ResizableHandle withHandle className="hidden md:flex" />

          {/* `defaultSize` ne vaut qu'au montage : quand la colonne article
              apparaît, react-resizable-panels redistribue lui-même les largeurs. */}
          <ResizablePanel id="pdf" order={2} defaultSize={80}>
            <div className="h-full flex flex-col overflow-hidden relative min-w-[200px]">
              <PdfViewer pdfUrl={data.pdfUrl} treeData={data.tree} />
              {/* Sous 1024px seulement : le panneau recouvre le PDF. Au-delà, il
                  vit dans sa propre colonne (ci-dessous) — jamais les deux, pour
                  ne pas dupliquer l'état d'édition en cours. */}
              {!isDesktop && <SidePanel mode="overlay" />}
            </div>
          </ResizablePanel>

          {showArticleColumn && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel id="article" order={3} defaultSize={24} minSize={18} maxSize={45}>
                <SidePanel mode="docked" />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Panneau d'anomalies — bord BAS (pleine largeur) : coexiste avec le
          panneau article (bord droit) sans le chevaucher. */}
      <AnomaliesPanel treeData={data.tree} />

      {/* Drawer structure pour mobile (le panneau gauche est masqué sous md) */}
      <Sheet open={structureDrawerOpen} onOpenChange={setStructureDrawerOpen}>
        <SheetContent side="left" className="p-0 w-[300px] sm:w-[340px] border-r border-b1 md:hidden">
          <SheetTitle className="sr-only">Structure du document</SheetTitle>
          <SheetDescription className="sr-only">Arborescence des titres, sections et articles</SheetDescription>
          <div className="h-full pt-2">
            <TreeView treeData={data.tree} />
          </div>
        </SheetContent>
      </Sheet>

      <VersionModal />
      <AddElementModal />
      <RenameNodeModal />
      <DeleteConfirmModal />
      <DocumentInfoModal document={data.document} />
      <EditDocumentModal document={data.document} />
      <PublishModal document={data.document} />
      <WorkFileModal document={data.document} />
      <Toaster />
    </div>
  );
}

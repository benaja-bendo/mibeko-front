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

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/components/ui/Resizable';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/shared/components/ui/Sheet';

export default function Viewer() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useDocumentData(id || '');
  const { structureDrawerOpen, setStructureDrawerOpen } = useViewerStore();

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
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={40} className="hidden md:block">
            <TreeView treeData={data.tree} />
          </ResizablePanel>
          
          <ResizableHandle withHandle className="hidden md:flex" />

          <ResizablePanel defaultSize={80}>
            <div className="h-full flex flex-col overflow-hidden relative min-w-[200px]">
              <PdfViewer pdfUrl={data.pdfUrl} pdfPages={data.pdfPages} treeData={data.tree} />
              <SidePanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
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
    </div>
  );
}

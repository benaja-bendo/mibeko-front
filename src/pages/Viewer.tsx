import { useParams } from 'react-router-dom';
import { useDocumentData } from '@/features/documents/hooks/useDocumentData';
import Topbar from '@/features/viewer/components/Topbar';
import TreeView from '@/features/viewer/components/TreeView';
import PdfViewer from '@/features/viewer/components/PdfViewer';
import SidePanel from '@/features/viewer/components/SidePanel';
import VersionModal from '@/features/viewer/components/VersionModal';
import AddElementModal from '@/features/viewer/components/AddElementModal';
import RenameNodeModal from '@/features/viewer/components/RenameNodeModal';
import DeleteConfirmModal from '@/features/viewer/components/DeleteConfirmModal';
import DocumentInfoModal from '@/features/viewer/components/DocumentInfoModal';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/components/ui/Resizable';

export default function Viewer() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useDocumentData(id || '');

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
      <VersionModal />
      <AddElementModal />
      <RenameNodeModal />
      <DeleteConfirmModal />
      <DocumentInfoModal document={data.document} />
    </div>
  );
}

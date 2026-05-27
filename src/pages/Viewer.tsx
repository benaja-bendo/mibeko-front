import { useParams } from 'react-router-dom';
import { useDocumentData } from '../hooks/useDocumentData';
import Topbar from '../components/viewer/Topbar';
import TreeView from '../components/viewer/TreeView';
import Splitter from '../components/viewer/Splitter';
import PdfViewer from '../components/viewer/PdfViewer';
import SidePanel from '../components/viewer/SidePanel';
import VersionModal from '../components/viewer/VersionModal';
import AddElementModal from '../components/viewer/AddElementModal';
import RenameNodeModal from '../components/viewer/RenameNodeModal';
import DeleteConfirmModal from '../components/viewer/DeleteConfirmModal';

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
        <TreeView treeData={data.tree} />
        <Splitter />

        <div className="flex-1 flex flex-col overflow-hidden relative min-w-[200px]">
          <PdfViewer pdfUrl={data.pdfUrl} pdfPages={data.pdfPages} treeData={data.tree} />
          <SidePanel />
        </div>
      </div>
      <VersionModal />
        <AddElementModal />
        <RenameNodeModal />
        <DeleteConfirmModal />
      </div>
    );
}

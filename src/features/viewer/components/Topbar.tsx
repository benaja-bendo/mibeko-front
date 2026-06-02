import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { cn } from '@/shared/lib/utils';
import { Clock, Download, GitGraph, PanelRight, ArrowLeft } from 'lucide-react';
import type { LegalDocument } from '@/shared/types/database';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ document }: { document?: LegalDocument }) {
  const { sidePanelOpen, closeSidePanel, setVersionModalOpen } = useViewerStore();
  const navigate = useNavigate();

  return (
    <div className="h-[50px] bg-s1 border-b border-b1 flex items-center px-2 sm:px-4 gap-2 sm:gap-3 shrink-0 z-50 overflow-hidden">
      <button 
        onClick={() => navigate(-1)}
        className="w-[30px] h-[30px] rounded border border-b1 bg-transparent text-t2 flex items-center justify-center transition-all hover:bg-s3 hover:border-b2 hover:text-t1 tip shrink-0"
        data-tip="Retour"
      >
        <ArrowLeft className="w-[15px] h-[15px]" strokeWidth={1.8} />
      </button>

      <div className="hidden sm:flex font-display text-[15px] sm:text-[17px] font-medium text-gold tracking-tight items-center gap-[7px] shrink-0">
        <svg viewBox="0 0 24 24" className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] stroke-current fill-none stroke-[1.7] stroke-linecap-round stroke-linejoin-round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        Mibeko Viewer
      </div>

      {document && (
        <div className="flex flex-col ml-1 sm:ml-2 min-w-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="hidden sm:inline-block bg-gold-d border border-[rgba(200,168,106,0.2)] text-gold text-[9px] font-semibold tracking-[0.08em] uppercase px-1.5 py-[1px] rounded font-mono shrink-0">
              {document.type?.code || document.type_code || 'DOC'} {document.dates?.signature || document.date_signature ? `· ${(document.dates?.signature || document.date_signature)?.split('-')[0]}` : ''}
            </span>
            <span className="hidden sm:inline-block text-[10px] text-t3 font-mono uppercase tracking-wider shrink-0">
              {document.id}
            </span>
          </div>
          <h1 className="text-[12px] sm:text-[14px] font-semibold text-t1 font-display truncate leading-tight mt-0.5 sm:-mt-0.5">
            {document.title || document.titre_officiel || 'Document sans titre'}
          </h1>
        </div>
      )}

      <div className="flex-1" />

      <div className="hidden sm:block w-px h-[18px] bg-b2 mx-1 shrink-0" />

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setVersionModalOpen(true)}
          className="hidden sm:flex w-[30px] h-[30px] rounded border border-b1 bg-transparent text-t2 items-center justify-center transition-all hover:bg-s3 hover:border-b2 hover:text-t1 tip"
          data-tip="Chronologie des versions"
        >
          <Clock className="w-[15px] h-[15px]" strokeWidth={1.8} />
        </button>

        <button
          className="hidden sm:flex w-[30px] h-[30px] rounded border border-b1 bg-transparent text-t2 items-center justify-center transition-all hover:bg-s3 hover:border-b2 hover:text-t1 tip"
          data-tip="Graphe des relations"
        >
          <GitGraph className="w-[15px] h-[15px]" strokeWidth={1.8} />
        </button>

        <button
          className="hidden sm:flex w-[30px] h-[30px] rounded border border-b1 bg-transparent text-t2 items-center justify-center transition-all hover:bg-s3 hover:border-b2 hover:text-t1 tip"
          data-tip="Exporter le document"
        >
          <Download className="w-[15px] h-[15px]" strokeWidth={1.8} />
        </button>

        <button
          onClick={() => sidePanelOpen ? closeSidePanel() : null}
          className={cn(
            "w-[30px] h-[30px] rounded border bg-transparent flex items-center justify-center transition-all tip",
            sidePanelOpen
              ? "bg-gold-d border-[rgba(200,168,106,0.25)] text-gold"
              : "border-b1 text-t2 hover:bg-s3 hover:border-b2 hover:text-t1"
          )}
          data-tip="Panneau article"
        >
          <PanelRight className="w-[15px] h-[15px]" strokeWidth={1.8} />
        </button>

        <button
          className="h-[30px] px-2 sm:px-3 ml-1 sm:ml-2 bg-gold text-[#120e00] text-[10px] sm:text-[11px] font-bold rounded flex items-center gap-2 hover:opacity-90 transition-opacity shadow-[0_4px_12px_rgba(200,168,106,0.2)] whitespace-nowrap"
        >
          <span className="hidden sm:inline">Publier les corrections</span>
          <span className="sm:hidden">Publier</span>
        </button>
      </div>
    </div>
  );
}

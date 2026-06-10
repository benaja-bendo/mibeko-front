import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { Download, PanelRight, ArrowLeft, MoreHorizontal, FileJson, FileText, Trash2, Info } from 'lucide-react';
import type { LegalDocument } from '@/shared/types/database';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/Tooltip';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu';
import { getDocumentExportUrl, getDocumentJsonUrl, getDocumentPdfUrl, downloadFile } from '@/features/documents/api/laravelApi';

export default function Topbar({ document }: { document?: LegalDocument }) {
  const { sidePanelOpen, closeSidePanel, setInfoModalOpen, setDeleteModal } = useViewerStore();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const isAdminOrEditor = user?.roles?.includes('admin') || user?.roles?.includes('editor');
  const isAdmin = user?.roles?.includes('admin');

  const handleDownload = async (type: 'consolidated' | 'original' | 'json') => {
    if (!document) return;
    
    const safeTitle = (document.titre_officiel || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    try {
      if (type === 'consolidated') {
        await downloadFile(getDocumentExportUrl(document.id), `${safeTitle}.pdf`);
      } else if (type === 'original') {
        await downloadFile(getDocumentPdfUrl(document.id), `${safeTitle}_original.pdf`);
      } else if (type === 'json') {
        await downloadFile(getDocumentJsonUrl(document.id), `${safeTitle}.json`);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
  };

  return (
    <div className="h-[50px] bg-s1 border-b border-b1 flex items-center px-2 sm:px-4 gap-2 sm:gap-3 shrink-0 z-50 overflow-hidden">
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            onClick={() => navigate(-1)}
            className="w-[30px] h-[30px] rounded border border-b1 bg-transparent text-t2 flex items-center justify-center transition-all hover:bg-s3 hover:border-b2 hover:text-t1 shrink-0"
          >
            <ArrowLeft className="w-[15px] h-[15px]" strokeWidth={1.8} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Retour</TooltipContent>
      </Tooltip>

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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setInfoModalOpen(true)}
              className="hidden sm:flex w-[30px] h-[30px] rounded border border-b1 bg-transparent text-t2 items-center justify-center transition-all hover:bg-s3 hover:border-b2 hover:text-t1"
            >
              <Info className="w-[15px] h-[15px]" strokeWidth={1.8} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Informations du document</TooltipContent>
        </Tooltip>

        {/* Dropdown Téléchargement */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="hidden sm:flex w-[30px] h-[30px] rounded border border-b1 bg-transparent text-t2 items-center justify-center transition-all hover:bg-s3 hover:border-b2 hover:text-t1">
                  <Download className="w-[15px] h-[15px]" strokeWidth={1.8} />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Télécharger le document</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleDownload('consolidated')}>
              <FileText className="w-4 h-4 text-gold" />
              <div className="flex flex-col">
                <span>Version consolidée</span>
                <span className="text-[10px] text-t3 font-mono">Format PDF Mibeko</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleDownload('original')}>
              <FileText className="w-4 h-4 text-t3" />
              <div className="flex flex-col">
                <span>PDF Original</span>
                <span className="text-[10px] text-t3 font-mono">Document source</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleDownload('json')}>
              <FileJson className="w-4 h-4 text-t3" />
              <div className="flex flex-col">
                <span>Format JSON</span>
                <span className="text-[10px] text-t3 font-mono">Structure de données</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dropdown Actions Globales */}
        {isAdminOrEditor && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className="w-[30px] h-[30px] rounded border bg-transparent flex items-center justify-center transition-all border-b1 text-t2 hover:bg-s3 hover:border-b2 hover:text-t1">
                    <MoreHorizontal className="w-[15px] h-[15px]" strokeWidth={1.8} />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Options du document</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem 
                className="gap-2 cursor-pointer"
                onClick={() => sidePanelOpen ? closeSidePanel() : null}
              >
                <PanelRight className="w-4 h-4" />
                <span>Ouvrir le panneau article</span>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="gap-2 text-red-400 focus:text-red-500 focus:bg-red-400/10 cursor-pointer"
                    onClick={() => {
                      if (document) {
                        setDeleteModal(true, { id: document.id, type: 'DOCUMENT', content: document.titre_officiel });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer le document</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {isAdminOrEditor && (
          <button
            className="h-[30px] px-2 sm:px-3 ml-1 sm:ml-2 bg-gold text-on-gold text-[10px] sm:text-[11px] font-bold rounded flex items-center gap-2 hover:opacity-90 transition-opacity shadow-[0_4px_12px_rgba(200,168,106,0.2)] whitespace-nowrap"
          >
            <span className="hidden sm:inline">Publier les corrections</span>
            <span className="sm:hidden">Publier</span>
          </button>
        )}
      </div>
    </div>
  );
}

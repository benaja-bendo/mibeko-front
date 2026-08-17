import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import {
  Download, PanelRight, ArrowLeft, MoreHorizontal, FileJson, FileText,
  Trash2, Info, FilePen, ListTree, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import type { LegalDocument } from '@/shared/types/database';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/Tooltip';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu';
import { getDocumentExportUrl, getDocumentJsonUrl, getDocumentPdfUrl, downloadFile, getDocumentCurationFlags } from '@/features/documents/api/laravelApi';
import { useQuery } from '@tanstack/react-query';

export default function Topbar({ document }: { document?: LegalDocument }) {
  const {
    sidePanelOpen, closeSidePanel, openSidePanel, selectedNode,
    setInfoModalOpen, setDeleteModal, setEditDocModalOpen,
    setPublishModalOpen, setStructureDrawerOpen, setAnomaliesPanel,
  } = useViewerStore();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isAdminOrEditor = user?.roles?.includes('admin') || user?.roles?.includes('editor');
  const isAdmin = user?.roles?.includes('admin');
  const isPublished = document?.curation_status === 'published';

  // Nombre d'anomalies non résolues — partage la clé de requête du panneau
  // (cache mutualisé : se met à jour quand on en résout une).
  const { data: openAnomalies = 0 } = useQuery({
    queryKey: ['curation-flags', document?.id],
    queryFn: () => getDocumentCurationFlags(document!.id).then((r) => r.data),
    enabled: Boolean(document?.id) && Boolean(isAdminOrEditor),
    select: (flags) => flags.filter((f) => !f.resolved).length,
    staleTime: 30000,
  });

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

  const handleTogglePanel = () => {
    if (sidePanelOpen) {
      closeSidePanel();
    } else if (selectedNode) {
      openSidePanel(selectedNode);
    }
  };

  const iconButtonClass = "w-[30px] h-[30px] rounded border border-b1 bg-transparent text-t2 items-center justify-center transition-all hover:bg-s3 hover:border-b2 hover:text-t1";

  return (
    <div className="h-[50px] bg-s1 border-b border-b1 flex items-center px-2 sm:px-4 gap-1.5 sm:gap-3 shrink-0 z-50 min-w-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate(-1)}
            className={`flex shrink-0 ${iconButtonClass}`}
          >
            <ArrowLeft className="w-[15px] h-[15px]" strokeWidth={1.8} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Retour</TooltipContent>
      </Tooltip>

      {/* Structure (arborescence) — uniquement sur mobile où le panneau gauche est masqué */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setStructureDrawerOpen(true)}
            className={`flex md:hidden shrink-0 ${iconButtonClass}`}
          >
            <ListTree className="w-[15px] h-[15px]" strokeWidth={1.8} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Structure du document</TooltipContent>
      </Tooltip>

      <div className="hidden lg:flex font-display text-[17px] font-medium text-gold tracking-tight items-center gap-[7px] shrink-0">
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-current fill-none stroke-[1.7] stroke-linecap-round stroke-linejoin-round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        Mibeko Viewer
      </div>

      {document && (
        <div className="flex flex-col ml-0.5 sm:ml-2 min-w-0">
          <div className="hidden sm:flex items-center gap-2 overflow-hidden">
            <span className="bg-gold-d border border-[rgba(200,168,106,0.2)] text-gold text-[9px] font-semibold tracking-[0.08em] uppercase px-1.5 py-[1px] rounded font-mono shrink-0">
              {document.type?.code || document.type_code || 'DOC'} {document.dates?.signature || document.date_signature ? `· ${(document.dates?.signature || document.date_signature)?.split('-')[0]}` : ''}
            </span>
            {isPublished && (
              <span className="inline-flex items-center gap-1 bg-green-d border border-[rgba(86,160,122,.25)] text-green text-[9px] font-semibold tracking-[0.08em] uppercase px-1.5 py-[1px] rounded font-mono shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5" /> Publié
              </span>
            )}
          </div>
          <h1 className="text-[12px] sm:text-[14px] font-semibold text-t1 font-display truncate leading-tight mt-0.5 sm:-mt-0.5">
            {document.title || document.titre_officiel || 'Document sans titre'}
          </h1>
          {/* Le titre officiel reste le H1 — c'est lui qui fait foi. Le libellé
              descriptif, dérivé du corps, s'ajoute EN DESSOUS pour les actes en
              abrégé dont l'intitulé se réduit au type, au numéro et à la date. */}
          {document.libelle_descriptif && (
            <p
              className="text-[11px] text-t2 truncate leading-tight"
              title={document.libelle_descriptif}
            >
              {document.libelle_descriptif}
            </p>
          )}
        </div>
      )}

      <div className="flex-1" />

      <div className="hidden sm:block w-px h-[18px] bg-b2 mx-1 shrink-0" />

      <div className="flex items-center gap-1 shrink-0">
        {/* Anomalies (vue Contrôle) — éditeurs/admins, avec compteur non résolu */}
        {isAdminOrEditor && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setAnomaliesPanel(true)}
                className={`relative flex ${openAnomalies > 0 ? 'border-amber/40 bg-amber/10 text-amber hover:bg-amber/20 w-[30px] h-[30px] rounded border items-center justify-center transition-all' : iconButtonClass}`}
              >
                <AlertTriangle className="w-[15px] h-[15px]" strokeWidth={1.8} />
                {openAnomalies > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-1 rounded-full bg-amber text-on-gold text-[9px] font-bold flex items-center justify-center tabular-nums">
                    {openAnomalies > 99 ? '99+' : openAnomalies}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {openAnomalies > 0 ? `${openAnomalies} anomalie(s) à traiter` : 'Anomalies de curation'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Modifier le document — éditeurs/admins, masqué sur mobile (présent dans le menu ⋯) */}
        {isAdminOrEditor && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setEditDocModalOpen(true)}
                className={`hidden sm:flex ${iconButtonClass}`}
              >
                <FilePen className="w-[15px] h-[15px]" strokeWidth={1.8} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Modifier le document</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setInfoModalOpen(true)}
              className={`hidden sm:flex ${iconButtonClass}`}
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
                <button className={`hidden sm:flex ${iconButtonClass}`}>
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

        {/* Menu ⋯ — accessible à tous : reprend sur mobile les actions
            masquées (infos, téléchargements) + actions d'édition selon rôle */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className={`flex ${iconButtonClass}`}>
                  <MoreHorizontal className="w-[15px] h-[15px]" strokeWidth={1.8} />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Options du document</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-[220px]">
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onClick={handleTogglePanel}
              disabled={!sidePanelOpen && !selectedNode}
            >
              <PanelRight className="w-4 h-4" />
              <span>{sidePanelOpen ? 'Fermer le panneau article' : 'Ouvrir le panneau article'}</span>
            </DropdownMenuItem>

            {/* Actions repliées ici sur mobile uniquement */}
            <div className="sm:hidden">
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setInfoModalOpen(true)}>
                <Info className="w-4 h-4" />
                <span>Informations du document</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-t3">
                Télécharger
              </DropdownMenuLabel>
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleDownload('consolidated')}>
                <FileText className="w-4 h-4 text-gold" />
                <span>Version consolidée</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleDownload('original')}>
                <FileText className="w-4 h-4 text-t3" />
                <span>PDF Original</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleDownload('json')}>
                <FileJson className="w-4 h-4 text-t3" />
                <span>Format JSON</span>
              </DropdownMenuItem>
            </div>

            {isAdminOrEditor && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setEditDocModalOpen(true)}>
                  <FilePen className="w-4 h-4" />
                  <span>Modifier le document</span>
                </DropdownMenuItem>
              </>
            )}

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

        {isAdminOrEditor && (
          <button
            onClick={() => setPublishModalOpen(true)}
            className={
              isPublished
                ? "h-[30px] px-2 sm:px-3 ml-1 sm:ml-2 bg-transparent border border-green/30 text-green text-[10px] sm:text-[11px] font-bold rounded flex items-center gap-1.5 hover:bg-green-d transition-colors whitespace-nowrap"
                : "h-[30px] px-2 sm:px-3 ml-1 sm:ml-2 bg-gold text-on-gold text-[10px] sm:text-[11px] font-bold rounded flex items-center gap-2 hover:opacity-90 transition-opacity shadow-[0_4px_12px_rgba(200,168,106,0.2)] whitespace-nowrap"
            }
          >
            {isPublished ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Publié</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Publier les corrections</span>
                <span className="sm:hidden">Publier</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

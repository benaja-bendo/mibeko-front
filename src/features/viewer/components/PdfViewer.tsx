import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { cn } from '@/shared/lib/utils';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Target, Maximize, MousePointer2, AlertCircle as LucideAlertCircle } from 'lucide-react';
import { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';
import { useParams } from 'react-router-dom';
import type { TreeNode } from '@/shared/types/database';
import { getStoredToken } from '@/features/auth/store/authStore';

// 1. Imports nécessaires de react-pdf
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 2. Configuration du Worker (déjà fait dans main.tsx, mais on le rappelle pour s'assurer que c'est pris en compte)
// pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
//pdf.worker.min.mjs
// pdfjs.GlobalWorkerOptions.workerSrc = 'https://app.unpkg.com/pdfjs-dist@6.0.227/files/build/pdf.worker.min.mjs';

// AJOUTEZ celle-ci (Vite gérera le chemin et le hashage du fichier de façon transparente) :
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface Zone {
  id: string;
  nodeId: string;
  lbl: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

export default function PdfViewer({
  pdfUrl,
  pdfPages,
  treeData = []
}: {
  pdfUrl?: string;
  pdfPages?: string[];
  treeData?: TreeNode[];
}) {
  const { id: documentId } = useParams<{ id: string }>();
  const {
    pdfZoom, setPdfZoom,
    pdfPage, setPdfPage,
    selectionMode, selectionTarget, stopSelection,
    selectedNode, selectNode
  } = useViewerStore();

  const { updateArticle } = useDocumentMutations(documentId || '');

  const ppRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const [numPages, setNumPages] = useState<number>(pdfPages?.length || 1);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number, y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  // Extract all zones from treeData
  const zones = useMemo(() => {
    const extracted: Zone[] = [];
    const walk = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'ARTICLE' && node.source_locator) {
          extracted.push({
            id: node.id,
            nodeId: node.id,
            lbl: `Art. ${node.numero}`,
            x: node.source_locator.x,
            y: node.source_locator.y,
            w: node.source_locator.width,
            h: node.source_locator.height,
            page: node.source_locator.page
          });
        }
        if (node.children) walk(node.children);
      });
    };
    walk(treeData);
    return extracted;
  }, [treeData]);

  const token = getStoredToken();
  const fileOptions = useMemo(() => {
    if (!pdfUrl) return null;
    return {
      url: pdfUrl,
      httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
      withCredentials: true
    };
  }, [pdfUrl, token]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft') {
        setPdfPage(Math.max(1, pdfPage - 1));
      } else if (e.key === 'ArrowRight') {
        setPdfPage(Math.min(numPages, pdfPage + 1));
      } else if (e.key === 'Escape' && selectionMode) {
        stopSelection();
        setDrawing(false);
        setDrawStart(null);
        setCurrentRect(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pdfPage, numPages, setPdfPage, selectionMode, stopSelection]);

  // Article -> PDF sync (Localization)
  useEffect(() => {
    // Only proceed if we have a valid source locator with a page number
    if (selectedNode?.source_locator && typeof selectedNode.source_locator.page === 'number') {
      const locator = selectedNode.source_locator;
      
      // Navigate to the correct page if needed
      if (locator.page !== pdfPage) {
        setPdfPage(locator.page);
      }
      
      // Auto-scroll to zone after a small delay to ensure page is rendered
      const timer = setTimeout(() => {
        const zoneElement = document.getElementById(`zone-${selectedNode.id}`);
        if (zoneElement) {
          zoneElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [pdfPage, selectedNode?.id, selectedNode?.source_locator, setPdfPage]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectionMode || !ppRef.current) return;
    e.preventDefault();
    const r = ppRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / pdfZoom;
    const y = (e.clientY - r.top) / pdfZoom;
    setDrawStart({ x, y });
    setDrawing(true);
    setCurrentRect({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !drawStart || !ppRef.current) return;
    const r = ppRef.current.getBoundingClientRect();
    const cx = (e.clientX - r.left) / pdfZoom;
    const cy = (e.clientY - r.top) / pdfZoom;

    setCurrentRect({
      x: Math.min(drawStart.x, cx),
      y: Math.min(drawStart.y, cy),
      w: Math.abs(cx - drawStart.x),
      h: Math.abs(cy - drawStart.y)
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drawing || !drawStart || !selectionTarget || !ppRef.current) return;

    const r = ppRef.current.getBoundingClientRect();
    const cx = (e.clientX - r.left) / pdfZoom;
    const cy = (e.clientY - r.top) / pdfZoom;

    const x = Math.min(drawStart.x, cx);
    const y = Math.min(drawStart.y, cy);
    const w = Math.abs(cx - drawStart.x);
    const h = Math.abs(cy - drawStart.y);

    if (w > 5 && h > 5) {
      // Persist to backend
      updateArticle.mutate({
        id: selectionTarget.id,
        source_locator: {
          page: pdfPage,
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(w),
          height: Math.round(h)
        }
      });
    }

    setDrawing(false);
    setDrawStart(null);
    setCurrentRect(null);
    stopSelection();
  };

  const handleZoneClick = (nodeId: string) => {
    // Find the node in treeData
    const findNode = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === nodeId) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const node = findNode(treeData);
    if (node) {
      selectNode(node.id, node);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative bg-s1">
      {/* Topbar of PDF - Responsive Design */}
      <div className="min-h-[38px] py-1 bg-s1 border-b border-b1 flex flex-wrap items-center px-3 gap-1.5 shrink-0 z-10">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-s2/50 border border-b1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span className="text-[9px] font-bold tracking-[0.05em] uppercase text-t2 font-mono whitespace-nowrap">
            PDF ORIGINAL
          </span>
        </div>

        <div className="flex-1 hidden sm:block" />

        <div className="flex items-center gap-1 ml-auto sm:ml-0">
          <button onClick={() => setPdfZoom(z => Math.max(0.5, z - 0.1))} className="w-[28px] h-[28px] rounded border border-b1 bg-transparent text-t2 flex items-center justify-center hover:bg-s3 hover:border-b2 hover:text-t1 transition-colors" title="Zoom arrière">
            <ZoomOut className="w-[14px] h-[14px]" />
          </button>
          <span className="text-[10px] text-t3 font-mono min-w-[36px] text-center">
            {Math.round(pdfZoom * 100)}%
          </span>
          <button onClick={() => setPdfZoom(z => Math.min(3, z + 0.1))} className="w-[28px] h-[28px] rounded border border-b1 bg-transparent text-t2 flex items-center justify-center hover:bg-s3 hover:border-b2 hover:text-t1 transition-colors" title="Zoom avant">
            <ZoomIn className="w-[14px] h-[14px]" />
          </button>
          <button onClick={() => setPdfZoom(1)} className="w-[28px] h-[28px] rounded border border-b1 bg-transparent text-t2 flex items-center justify-center hover:bg-s3 hover:border-b2 hover:text-t1 transition-colors ml-1" title="Taille réelle">
            <Maximize className="w-[14px] h-[14px]" />
          </button>
        </div>

        <div className="w-px h-[18px] bg-b2 mx-1 hidden xs:block" />

        <div className="flex items-center gap-1">
          <button onClick={() => setPdfPage(Math.max(1, pdfPage - 1))} className="w-[28px] h-[28px] rounded border border-b1 bg-transparent text-t2 flex items-center justify-center hover:bg-s3 hover:border-b2 hover:text-t1 transition-colors" title="Page précédente">
            <ChevronLeft className="w-[14px] h-[14px]" />
          </button>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={pdfPage || 1}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1 && val <= numPages) {
                  setPdfPage(val);
                }
              }}
              className="w-[30px] h-[24px] bg-s2 border border-b1 rounded text-t1 text-[11px] font-mono text-center outline-none transition-colors focus:border-b3"
            />
            <span className="text-[10px] text-t3 font-mono">/ {numPages}</span>
          </div>
          <button onClick={() => setPdfPage(Math.min(numPages, pdfPage + 1))} className="w-[28px] h-[28px] rounded border border-b1 bg-transparent text-t2 flex items-center justify-center hover:bg-s3 hover:border-b2 hover:text-t1 transition-colors" title="Page suivante">
            <ChevronRight className="w-[14px] h-[14px]" />
          </button>
        </div>
      </div>

      {/* PDF Content Area */}
      <div
        ref={pdfContainerRef}
        className={cn(
          "flex-1 overflow-auto bg-bg flex justify-center py-6 px-4 relative custom-scrollbar scroll-smooth",
          selectionMode && "cursor-crosshair"
        )}
      >
        {selectionMode && selectionTarget && (
          <div className="fixed top-[100px] left-1/2 -translate-x-1/2 bg-gold text-on-gold text-[11px] font-bold py-2 px-4 rounded-full z-[200] flex items-center gap-2 shadow-[0_8px_32px_rgba(200,168,106,0.4)] pointer-events-none animate-in fade-in slide-in-from-top-4">
            <Target className="w-4 h-4" strokeWidth={2.5} />
            <span>Tracez la zone pour l'<b>{selectionTarget.type === 'ARTICLE' ? 'Art. ' : ''}{selectionTarget.numero}</b></span>
            <div className="w-px h-3 bg-on-gold/20 mx-1" />
            <span className="opacity-70 text-[10px]">Échap pour annuler</span>
          </div>
        )}

        <div
          ref={ppRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={cn(
            "bg-white w-[580px] min-h-[820px] rounded shadow-[0_20px_80px_rgba(0,0,0,0.8)] relative shrink-0 origin-top overflow-hidden transition-transform duration-200",
            selectionMode && "cursor-crosshair"
          )}
          style={{
            transform: `scale(${pdfZoom})`,
            marginBottom: `${(pdfZoom - 1) * 820 + 40}px`
          }}
        >
          {/* Active drawing rect */}
          {currentRect && (
            <div
              className="absolute border-2 border-gold bg-gold/10 rounded-sm pointer-events-none z-[60] shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
              style={{ left: currentRect.x, top: currentRect.y, width: currentRect.w, height: currentRect.h }}
            />
          )}

          {/* Existing zones for current page */}
          {zones.filter(z => z.page === pdfPage).map(z => {
            const isActive = selectedNode?.id === z.nodeId;
            return (
              <div
                key={z.id}
                id={`zone-${z.nodeId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoneClick(z.nodeId);
                }}
                className={cn(
                  "absolute border-2 rounded-[2px] cursor-pointer z-50 transition-all group",
                  isActive ? "border-gold bg-gold/15 shadow-[0_0_15px_rgba(200,168,106,0.4)] z-[55]" : "border-teal-500/40 bg-teal-500/5 hover:border-teal-500 hover:bg-teal-500/10"
                )}
                style={{
                  left: z.x, top: z.y, width: z.w, height: z.h,
                }}
              >
                <div
                  className={cn(
                    "absolute -top-[18px] left-0 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-t-[3px] whitespace-nowrap tracking-wider uppercase transition-colors",
                    isActive ? "bg-gold text-bg" : "bg-teal-500 text-bg opacity-0 group-hover:opacity-100"
                  )}
                >
                  {z.lbl}
                </div>
                {isActive && (
                  <div className="absolute -right-1 -top-1 w-2 h-2 bg-gold rounded-full animate-ping" />
                )}
              </div>
            );
          })}

          {/* PDF Rendering */}
          {fileOptions ? (
             <div className="w-full h-full flex justify-center bg-white absolute inset-0 overflow-auto no-scrollbar">
                <Document
                  file={fileOptions}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  loading={
                    <div className="flex flex-col items-center justify-center h-full w-full text-t3 gap-3">
                      <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      <span className="text-[10px] font-mono tracking-widest uppercase">Chargement</span>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center h-full w-full p-10 text-center">
                      <LucideAlertCircle className="w-8 h-8 text-red mb-4 opacity-50" />
                      <p className="text-red text-[11px] font-mono mb-4">Erreur de chargement du PDF.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(pdfUrl, '_blank')}
                        className="text-red border-red/20 hover:bg-red/5"
                      >
                        <Maximize className="w-3.5 h-3.5 mr-2" /> Ouvrir en externe
                      </Button>
                    </div>
                  }
                >
                  <Page
                    pageNumber={pdfPage}
                    scale={1}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-inner"
                  />
                </Document>
             </div>
          ) : (
            <div
              className="py-[54px] px-[52px] font-serif text-[#181818] leading-[1.65] text-[11.5px] bg-[#fdfdfc]"
              dangerouslySetInnerHTML={{ __html: pdfPages?.[pdfPage - 1] || '' }}
            />
          )}

          <div className="absolute bottom-4 w-full text-center text-[10px] text-zinc-400 font-serif z-40 pointer-events-none select-none italic">
            — {pdfPage} —
          </div>
        </div>
      </div>

      {/* Footer / Shortcut info */}
      <div className="h-6 bg-s2 border-t border-b1 flex items-center px-3 justify-between">
        <div className="flex items-center gap-3 text-[9px] text-t3 font-mono">
          <span className="flex items-center gap-1"><kbd className="px-1 bg-s3 rounded border border-b1">←</kbd> <kbd className="px-1 bg-s3 rounded border border-b1">→</kbd> Navigation</span>
          <span className="flex items-center gap-1"><kbd className="px-1 bg-s3 rounded border border-b1">ESC</kbd> Annuler</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-t3 font-mono">
          <MousePointer2 className="w-2.5 h-2.5" />
          <span>Sélectionnez une zone pour lier un article</span>
        </div>
      </div>
    </div>
  );
}

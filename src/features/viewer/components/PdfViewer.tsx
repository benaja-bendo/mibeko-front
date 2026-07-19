import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { cn } from '@/shared/lib/utils';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Target, Maximize, MoveHorizontal, MousePointer2, AlertCircle as LucideAlertCircle } from 'lucide-react';
import { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';
import { useParams } from 'react-router-dom';
import type { TreeNode } from '@/shared/types/database';
import { getStoredToken } from '@/features/auth/store/authStore';
import { laravelClient } from '@/shared/api/laravelClient';

// Imports nécessaires de react-pdf (le worker est configuré dans main.tsx)
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { PDF_OPTIONS } from '@/shared/lib/pdfOptions';

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
  treeData = []
}: {
  pdfUrl?: string;
  treeData?: TreeNode[];
}) {
  const { id: documentId } = useParams<{ id: string }>();
  // Sélecteurs ciblés : le PDF ne se re-rend plus pour des changements d'état
  // sans rapport (ouverture de modales, frappe dans la recherche, repli de
  // l'arbre…), seulement pour ce qu'il consomme réellement.
  const pdfZoom = useViewerStore((s) => s.pdfZoom);
  const setPdfZoom = useViewerStore((s) => s.setPdfZoom);
  const pdfPage = useViewerStore((s) => s.pdfPage);
  const setPdfPage = useViewerStore((s) => s.setPdfPage);
  const selectionMode = useViewerStore((s) => s.selectionMode);
  const selectionTarget = useViewerStore((s) => s.selectionTarget);
  const stopSelection = useViewerStore((s) => s.stopSelection);
  const selectedNode = useViewerStore((s) => s.selectedNode);
  const selectNode = useViewerStore((s) => s.selectNode);

  const { updateArticle } = useDocumentMutations(documentId || '');

  const ppRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  // Proxy pdf.js (capté au chargement) + cache du texte normalisé par page :
  // permet de retrouver la page d'un élément EN CHERCHANT dans le texte du PDF
  // quand aucune coordonnée n'a été enregistrée à l'ingestion (cas courant).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfProxyRef = useRef<any>(null);
  const pageTextCache = useRef<Map<number, string>>(new Map());
  const [locating, setLocating] = useState(false);
  // « Ouvrir en externe » : le PDF source d'un brouillon répond 404 sans jeton
  // (garde des documents non publiés). Un window.open(pdfUrl) nu n'envoie pas
  // l'Authorization → on télécharge via le client authentifié et on ouvre un
  // blob object-URL.
  const [openingExternal, setOpeningExternal] = useState(false);
  const [openExternalError, setOpenExternalError] = useState(false);

  const [numPages, setNumPages] = useState<number>(1);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number, y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  // Mode « ajuster à la largeur » : actif par défaut pour que la page tienne
  // dans le conteneur (essentiel sur mobile/tablette). Désactivé dès que
  // l'utilisateur règle le zoom manuellement.
  const [fitMode, setFitMode] = useState(true);

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

  // Largeur de référence de la « feuille » (le système de coordonnées des zones
  // PDF est exprimé dans cette base ; on ne fait que la mettre à l'échelle).
  const PAPER_W = 580;

  // Calcule le zoom qui fait tenir la feuille dans la largeur disponible.
  const applyFit = React.useCallback(() => {
    const el = pdfContainerRef.current;
    if (!el) return;
    const available = el.clientWidth - 32; // px-4 de chaque côté
    const z = Math.min(2, Math.max(0.4, available / PAPER_W));
    setPdfZoom(Number(z.toFixed(3)));
  }, [setPdfZoom]);

  // En mode « ajuster », recalcule au montage et à chaque redimensionnement.
  useEffect(() => {
    if (!fitMode) return;
    applyFit();
    const el = pdfContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => applyFit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitMode, applyFit]);

  // Nouveau document : on rétablit le mode « ajuster à la largeur ». `fitMode`
  // est un état LOCAL : comme la route n'est pas keyée, ce composant n'est pas
  // remonté au changement de document, donc le store ne peut pas le remettre à
  // zéro — sans ça, un zoom manuel sur le document précédent persisterait.
  useEffect(() => {
    setFitMode(true);
  }, [documentId]);

  // Réglage manuel du zoom : sort du mode « ajuster ».
  const manualZoom = (updater: number | ((z: number) => number)) => {
    setFitMode(false);
    setPdfZoom(updater);
  };

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

  // Normalise un texte pour la comparaison (sans accents, majuscules, espaces compactés).
  const normalizeText = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

  // Texte normalisé d'une page (mis en cache : une extraction par page max).
  const getPageText = React.useCallback(async (n: number): Promise<string> => {
    if (pageTextCache.current.has(n)) return pageTextCache.current.get(n)!;
    const pdf = pdfProxyRef.current;
    if (!pdf) return '';
    try {
      const page = await pdf.getPage(n);
      const tc = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txt = normalizeText((tc.items as any[]).map((i) => i.str ?? '').join(' '));
      pageTextCache.current.set(n, txt);
      return txt;
    } catch {
      return '';
    }
  }, []);

  // Motifs de recherche d'un élément dans le texte du PDF (heuristique OCR-tolérante).
  const searchCandidates = (node: TreeNode): string[] => {
    const num = normalizeText(String(node.numero ?? ''));
    const candidates: string[] = [];

    if (node.type === 'ARTICLE') {
      // Entête « Article N » (le plus fiable pour un article numéroté).
      if (num && !['PREAMBULE', 'SIGNATURE'].includes(num) && !num.startsWith('TABLEAU')) {
        candidates.push(`ARTICLE ${num}`, `ART. ${num}`, `ART ${num}`);
      }
      // Repli universel : un extrait du contenu (couvre préambule/signature et
      // les cas où la numérotation OCR diffère). On prend une phrase d'amorce.
      const snippet = normalizeText(String(node.content ?? ''))
        .split(' ')
        .filter((w) => w.length > 2)
        .slice(0, 6)
        .join(' ');
      if (snippet.length >= 10) candidates.push(snippet);
    } else {
      const type = normalizeText(String(node.type ?? ''));
      if (type && num) candidates.push(`${type} ${num}`);
    }

    return candidates;
  };

  // Cherche la 1re page contenant l'élément (depuis la page courante puis depuis le début).
  const findPageForNode = React.useCallback(async (node: TreeNode): Promise<number | null> => {
    const pdf = pdfProxyRef.current;
    const candidates = searchCandidates(node);
    if (!pdf || candidates.length === 0) return null;
    const total: number = pdf.numPages;
    const order: number[] = [];
    for (let p = pdfPage; p <= total; p++) order.push(p);
    for (let p = 1; p < pdfPage; p++) order.push(p);
    for (const p of order) {
      const t = await getPageText(p);
      if (candidates.some((c) => t.includes(c))) return p;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getPageText, pdfPage]);

  // Article/élément -> PDF : navigation automatique vers la page concernée.
  // 1) coordonnées enregistrées (source_locator.page) si présentes ;
  // 2) sinon, recherche du libellé dans le texte du PDF (indépendant de l'ingestion).
  useEffect(() => {
    if (!selectedNode) return;

    const loc = selectedNode.source_locator;
    if (loc && typeof loc.page === 'number') {
      if (loc.page !== pdfPage) setPdfPage(loc.page);
      const timer = setTimeout(() => {
        document.getElementById(`zone-${selectedNode.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return () => clearTimeout(timer);
    }

    // Pas de coordonnées : on localise par le texte du PDF.
    let cancelled = false;
    setLocating(true);
    findPageForNode(selectedNode)
      .then((p) => {
        if (!cancelled && p && p !== pdfPage) setPdfPage(p);
      })
      .finally(() => {
        if (!cancelled) setLocating(false);
      });
    return () => {
      cancelled = true;
    };
    // On ne dépend QUE de l'élément sélectionné (pas de pdfPage : éviter les boucles).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode?.id]);

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

  // Ouvre le PDF source dans un nouvel onglet en passant par le client
  // authentifié (l'intercepteur ajoute le Bearer) : indispensable pour un
  // brouillon, dont la route publique répond 404 à un appel anonyme.
  const handleOpenExternal = async () => {
    if (!documentId || openingExternal) return;
    setOpenExternalError(false);
    setOpeningExternal(true);
    try {
      const { data } = await laravelClient.get<Blob>(
        `/legal-documents/${documentId}/pdf`,
        { responseType: 'blob' },
      );
      const blobUrl = URL.createObjectURL(data);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      // Laisse au navigateur le temps de charger le blob avant de révoquer.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      setOpenExternalError(true);
    } finally {
      setOpeningExternal(false);
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

        {locating && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-gold whitespace-nowrap">
            <span className="w-3 h-3 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            Localisation…
          </span>
        )}

        <div className="flex-1 hidden sm:block" />

        <div className="flex items-center gap-1 ml-auto sm:ml-0">
          <button onClick={() => manualZoom(z => Math.max(0.5, z - 0.1))} className="w-[28px] h-[28px] rounded border border-b1 bg-transparent text-t2 flex items-center justify-center hover:bg-s3 hover:border-b2 hover:text-t1 transition-colors" title="Zoom arrière">
            <ZoomOut className="w-[14px] h-[14px]" />
          </button>
          <span className="text-[10px] text-t3 font-mono min-w-[36px] text-center">
            {Math.round(pdfZoom * 100)}%
          </span>
          <button onClick={() => manualZoom(z => Math.min(3, z + 0.1))} className="w-[28px] h-[28px] rounded border border-b1 bg-transparent text-t2 flex items-center justify-center hover:bg-s3 hover:border-b2 hover:text-t1 transition-colors" title="Zoom avant">
            <ZoomIn className="w-[14px] h-[14px]" />
          </button>
          <button
            onClick={() => setFitMode(true)}
            className={cn(
              'w-[28px] h-[28px] rounded border flex items-center justify-center transition-colors ml-1',
              fitMode ? 'border-gold/40 bg-gold/10 text-gold' : 'border-b1 bg-transparent text-t2 hover:bg-s3 hover:border-b2 hover:text-t1',
            )}
            title="Ajuster à la largeur"
          >
            <MoveHorizontal className="w-[14px] h-[14px]" />
          </button>
          <button onClick={() => manualZoom(1)} className="w-[28px] h-[28px] rounded border border-b1 bg-transparent text-t2 flex items-center justify-center hover:bg-s3 hover:border-b2 hover:text-t1 transition-colors" title="Taille réelle (100%)">
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

        {/* Conteneur d'échelle : sa boîte de layout vaut la taille MISE À L'ÉCHELLE
            de la feuille, ce qui supprime le débordement horizontal (mobile) et
            l'espace vertical fantôme. La feuille interne est mise à l'échelle via
            transform avec origine top-left (la géométrie des zones, calculée par
            getBoundingClientRect ÷ zoom, reste exacte quelle que soit l'origine). */}
        <div
          className="shrink-0"
          style={{ width: PAPER_W * pdfZoom, height: 820 * pdfZoom, marginBottom: 40 }}
        >
        <div
          ref={ppRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={cn(
            "bg-white w-[580px] h-[820px] rounded shadow-[0_20px_80px_rgba(0,0,0,0.8)] relative origin-top-left overflow-hidden transition-transform duration-200",
            selectionMode && "cursor-crosshair"
          )}
          style={{
            transform: `scale(${pdfZoom})`,
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
                  options={PDF_OPTIONS}
                  onLoadSuccess={(pdf) => {
                    // On capte le proxy pdf.js pour la recherche de page par texte,
                    // et on vide le cache (nouveau document chargé).
                    pdfProxyRef.current = pdf;
                    pageTextCache.current.clear();
                    setNumPages(pdf.numPages);
                  }}
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
                        onClick={handleOpenExternal}
                        disabled={openingExternal}
                        className="text-red border-red/20 hover:bg-red/5"
                      >
                        <Maximize className="w-3.5 h-3.5 mr-2" />
                        {openingExternal ? 'Ouverture…' : 'Ouvrir en externe'}
                      </Button>
                      {openExternalError && (
                        <p className="text-red/70 text-[10px] font-mono mt-3">Ouverture impossible.</p>
                      )}
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
            <div className="flex items-center justify-center h-full w-full text-t3 text-[10px] font-mono tracking-widest uppercase bg-[#fdfdfc]">
              Aucun PDF associé
            </div>
          )}

          <div className="absolute bottom-4 w-full text-center text-[10px] text-zinc-400 font-serif z-40 pointer-events-none select-none italic">
            — {pdfPage} —
          </div>
        </div>
        </div>
      </div>

      {/* Footer / Shortcut info — aide clavier/souris, pertinente sur desktop seulement */}
      <div className="h-6 bg-s2 border-t border-b1 hidden md:flex items-center px-3 justify-between">
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

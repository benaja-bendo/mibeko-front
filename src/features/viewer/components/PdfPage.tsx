import React from 'react';
import { Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { cn } from '@/shared/lib/utils';
import type { TreeNode } from '@/shared/types/database';

interface ZoneRect {
  id: string;
  nodeId: string;
  lbl: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Une page du PDF dans le défilement continu — extrait de PdfViewer pour que
 * chaque page monte/démonte indépendamment sous la virtualisation
 * (@tanstack/react-virtual, comme l'arbre du viewer). Gère elle-même le
 * tracé souris/tactile d'une zone, dans SES propres coordonnées (plus besoin
 * d'un `pdfPage` global unique — chaque page connaît son propre numéro).
 */
export default function PdfPage({
  pageNumber,
  zoom,
  size,
  zones,
  selectedNodeId,
  selectionMode,
  selectionTarget,
  onZoneClick,
  onZoneDrawn,
  onMeasuredSize,
}: {
  pageNumber: number;
  zoom: number;
  size: { width: number; height: number };
  zones: ZoneRect[];
  selectedNodeId: string | null;
  selectionMode: boolean;
  selectionTarget: TreeNode | null;
  onZoneClick: (nodeId: string) => void;
  onZoneDrawn: (page: number, rect: { x: number; y: number; w: number; h: number }) => void;
  onMeasuredSize: (page: number, size: { width: number; height: number }) => void;
}) {
  const ppRef = React.useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = React.useState(false);
  const [drawStart, setDrawStart] = React.useState<Point | null>(null);
  const [currentRect, setCurrentRect] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Le mode sélection est un booléen GLOBAL (store) : quand il se referme
  // (Échap, zone validée ailleurs…), chaque page efface son propre tracé en
  // cours s'il y en avait un — pas besoin que le parent sache laquelle dessinait.
  React.useEffect(() => {
    if (!selectionMode) {
      setDrawing(false);
      setDrawStart(null);
      setCurrentRect(null);
    }
  }, [selectionMode]);

  const getPointFromClient = (clientX: number, clientY: number): Point | null => {
    const r = ppRef.current?.getBoundingClientRect();
    if (!r) return null;
    return { x: (clientX - r.left) / zoom, y: (clientY - r.top) / zoom };
  };

  const commitZone = (endPoint: Point) => {
    if (drawStart && selectionTarget) {
      const x = Math.min(drawStart.x, endPoint.x);
      const y = Math.min(drawStart.y, endPoint.y);
      const w = Math.abs(endPoint.x - drawStart.x);
      const h = Math.abs(endPoint.y - drawStart.y);
      if (w > 5 && h > 5) {
        onZoneDrawn(pageNumber, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
      }
    }
    setDrawing(false);
    setDrawStart(null);
    setCurrentRect(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectionMode) return;
    e.preventDefault();
    const p = getPointFromClient(e.clientX, e.clientY);
    if (!p) return;
    setDrawStart(p);
    setDrawing(true);
    setCurrentRect({ ...p, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !drawStart) return;
    const p = getPointFromClient(e.clientX, e.clientY);
    if (!p) return;
    setCurrentRect({
      x: Math.min(drawStart.x, p.x),
      y: Math.min(drawStart.y, p.y),
      w: Math.abs(p.x - drawStart.x),
      h: Math.abs(p.y - drawStart.y),
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drawing || !drawStart || !selectionTarget) return;
    const p = getPointFromClient(e.clientX, e.clientY);
    if (p) commitZone(p);
  };

  // Équivalents tactiles — même logique, `touch-action: none` (posé plus bas,
  // actif seulement en mode sélection) coupe le geste natif de défilement
  // pendant le tracé.
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!selectionMode) return;
    const t = e.touches[0];
    if (!t) return;
    const p = getPointFromClient(t.clientX, t.clientY);
    if (!p) return;
    setDrawStart(p);
    setDrawing(true);
    setCurrentRect({ ...p, w: 0, h: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!drawing || !drawStart) return;
    const t = e.touches[0];
    if (!t) return;
    const p = getPointFromClient(t.clientX, t.clientY);
    if (!p) return;
    setCurrentRect({
      x: Math.min(drawStart.x, p.x),
      y: Math.min(drawStart.y, p.y),
      w: Math.abs(p.x - drawStart.x),
      h: Math.abs(p.y - drawStart.y),
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!drawing || !drawStart || !selectionTarget) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const p = getPointFromClient(t.clientX, t.clientY);
    if (p) commitZone(p);
  };

  return (
    <div className="mx-auto shrink-0" style={{ width: size.width * zoom, height: size.height * zoom }}>
      <div
        ref={ppRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          'bg-white rounded shadow-[0_20px_80px_rgba(0,0,0,0.8)] relative origin-top-left overflow-hidden',
          selectionMode && 'cursor-crosshair',
        )}
        style={{
          width: size.width,
          height: size.height,
          transform: `scale(${zoom})`,
          touchAction: selectionMode ? 'none' : undefined,
        }}
      >
        {currentRect && (
          <div
            className="absolute border-2 border-gold bg-gold/10 rounded-sm pointer-events-none z-[60] shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
            style={{ left: currentRect.x, top: currentRect.y, width: currentRect.w, height: currentRect.h }}
          />
        )}

        {zones.map((z) => {
          const isActive = selectedNodeId === z.nodeId;
          return (
            <div
              key={z.id}
              id={`zone-${z.nodeId}`}
              onClick={(e) => {
                e.stopPropagation();
                onZoneClick(z.nodeId);
              }}
              className={cn(
                'absolute border-2 rounded-[2px] cursor-pointer z-50 transition-all group',
                isActive
                  ? 'border-gold bg-gold/15 shadow-[0_0_15px_rgba(200,168,106,0.4)] z-[55]'
                  : 'border-teal-500/40 bg-teal-500/5 hover:border-teal-500 hover:bg-teal-500/10',
              )}
              style={{ left: z.x, top: z.y, width: z.w, height: z.h }}
            >
              <div
                className={cn(
                  'absolute -top-[18px] left-0 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-t-[3px] whitespace-nowrap tracking-wider uppercase transition-colors',
                  isActive ? 'bg-gold text-bg' : 'bg-teal-500 text-bg opacity-0 group-hover:opacity-100',
                )}
              >
                {z.lbl}
              </div>
              {isActive && <div className="absolute -right-1 -top-1 w-2 h-2 bg-gold rounded-full animate-ping" />}
            </div>
          );
        })}

        <Page
          pageNumber={pageNumber}
          scale={1}
          renderTextLayer
          renderAnnotationLayer
          className="shadow-inner"
          onLoadSuccess={(page) => {
            const viewport = page.getViewport({ scale: 1 });
            onMeasuredSize(pageNumber, { width: viewport.width, height: viewport.height });
          }}
          loading={
            <div className="flex flex-col items-center justify-center gap-2 bg-white" style={{ width: size.width, height: size.height }}>
              <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          }
        />

        <div className="absolute bottom-4 w-full text-center text-[10px] text-zinc-400 font-serif z-40 pointer-events-none select-none italic">
          — {pageNumber} —
        </div>
      </div>
    </div>
  );
}

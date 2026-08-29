import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/shared/components/ui/Button';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { cn } from '@/shared/lib/utils';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Target, Maximize, MoveHorizontal, MousePointer2, AlertCircle as LucideAlertCircle } from 'lucide-react';
import { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';
import { useParams } from 'react-router-dom';
import type { TreeNode } from '@/shared/types/database';
import { getStoredToken } from '@/features/auth/store/authStore';
import { laravelClient } from '@/shared/api/laravelClient';

// Le worker pdf.js est configuré dans main.tsx. `<Page>` vit désormais dans
// PdfPage.tsx (une page du défilement continu), pas ici.
import { Document } from 'react-pdf';

import { PDF_OPTIONS } from '@/shared/lib/pdfOptions';
import PdfPage from './PdfPage';

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

// Espace vertical entre deux pages dans le défilement continu.
const PAGE_GAP = 24;
// Taille de repli tant qu'aucune page n'a encore été mesurée par pdf.js (au
// tout premier rendu seulement — chaque page corrige ensuite sa propre taille).
const FALLBACK_SIZE = { width: 580, height: 820 };

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
  // Mode « ajuster à la largeur » : actif par défaut pour que la page tienne
  // dans le conteneur (essentiel sur mobile/tablette). Désactivé dès que
  // l'utilisateur règle le zoom manuellement.
  const [fitMode, setFitMode] = useState(true);
  // Taille réelle de chaque page, mesurée par pdf.js au fil du défilement
  // (chaque PdfPage rapporte la sienne à son chargement) — remplace une
  // ancienne boîte 580×820 codée en dur qui ne correspondait à aucun format
  // réel et décalait les zones cliquables dès qu'un scan avait une autre taille.
  const [pageSizes, setPageSizes] = useState<Map<number, { width: number; height: number }>>(new Map());
  // Champ de saisie du numéro de page : état local pour ne naviguer qu'une
  // fois la frappe terminée (sinon taper « 12 » saute transitoirement page 1).
  const [pageInputValue, setPageInputValue] = useState('1');

  // Sert de référence pour le zoom « ajuster » et de repli pour les pages pas
  // encore mesurées — la page 1 est la première rendue, donc mesurée quasi
  // immédiatement après le chargement du document.
  const referencePageSize = pageSizes.get(1) ?? FALLBACK_SIZE;

  const handleMeasuredSize = (page: number, size: { width: number; height: number }) => {
    setPageSizes((prev) => {
      const existing = prev.get(page);
      if (existing && existing.width === size.width && existing.height === size.height) return prev;
      return new Map(prev).set(page, size);
    });
  };

  // Zones extraites de l'arbre et groupées par page (accès O(1) depuis chaque
  // PdfPage) — un document peut compter plusieurs milliers d'articles.
  const zonesByPage = useMemo(() => {
    const map = new Map<number, Zone[]>();
    const walk = (nodes: TreeNode[]) => {
      nodes.forEach((node) => {
        if (node.type === 'ARTICLE' && node.source_locator) {
          const zone: Zone = {
            id: node.id,
            nodeId: node.id,
            lbl: `Art. ${node.numero}`,
            x: node.source_locator.x,
            y: node.source_locator.y,
            w: node.source_locator.width,
            h: node.source_locator.height,
            page: node.source_locator.page,
          };
          const arr = map.get(zone.page) ?? [];
          arr.push(zone);
          map.set(zone.page, arr);
        }
        if (node.children) walk(node.children);
      });
    };
    walk(treeData);
    return map;
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

  // Défilement continu virtualisé (même principe que l'arbre du viewer, voir
  // TreeView) : seules les pages proches de l'écran sont montées.
  // `estimateSize` sert de repli avant mesure réelle ; `measureElement`
  // (posé sur chaque ligne dans le rendu plus bas) corrige ensuite la
  // position des pages suivantes. `overscan: 2` précharge gratuitement les
  // pages voisines (±2) pendant les temps morts.
  const rowVirtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => pdfContainerRef.current,
    estimateSize: (index) => (pageSizes.get(index + 1)?.height ?? referencePageSize.height) * pdfZoom + PAGE_GAP,
    overscan: 2,
  });

  // Le zoom change la taille RENDUE de chaque page : redemande une mesure
  // (même logique que TreeView quand la densité de l'arbre change).
  useEffect(() => {
    rowVirtualizer.measure();
  }, [pdfZoom, rowVirtualizer]);

  // Fait défiler jusqu'à la page `n` et met à jour l'indicateur tout de
  // suite ; le défilement lui-même le confirmera ensuite via `handleScroll`.
  const scrollToPage = (n: number, behavior: 'smooth' | 'auto' = 'smooth') => {
    const target = Math.max(1, Math.min(numPages, n));
    setPdfPage(target);
    rowVirtualizer.scrollToIndex(target - 1, { align: 'start', behavior });
  };

  // Garde le champ de saisie synchro avec la page réelle (bouton, clavier,
  // défilement manuel, localisation automatique…) sans écraser une frappe en
  // cours : seule la validation (Entrée/perte de focus) navigue.
  useEffect(() => {
    setPageInputValue(String(pdfPage || 1));
  }, [pdfPage]);

  const commitPageInput = () => {
    const val = parseInt(pageInputValue, 10);
    if (!isNaN(val) && val >= 1 && val <= numPages) {
      scrollToPage(val);
    } else {
      setPageInputValue(String(pdfPage || 1));
    }
  };

  // Déduit la page « courante » du défilement (la première ligne dont le bas
  // dépasse le haut du conteneur) pour garder l'indicateur à jour pendant un
  // défilement manuel — pas seulement lors d'une navigation explicite.
  const handleScroll = () => {
    const el = pdfContainerRef.current;
    if (!el) return;
    const items = rowVirtualizer.getVirtualItems();
    if (items.length === 0) return;
    const scrollTop = el.scrollTop;
    const current = items.find((it) => it.start + it.size > scrollTop) ?? items[0];
    const n = current.index + 1;
    if (n !== pdfPage) setPdfPage(n);
  };

  // Calcule le zoom qui fait tenir la feuille (à sa taille réelle) dans la
  // largeur disponible.
  const applyFit = React.useCallback(() => {
    const el = pdfContainerRef.current;
    if (!el) return;
    const available = el.clientWidth - 32; // px-4 de chaque côté
    const z = Math.min(2, Math.max(0.4, available / referencePageSize.width));
    setPdfZoom(Number(z.toFixed(3)));
  }, [setPdfZoom, referencePageSize.width]);

  // En mode « ajuster », recalcule au montage, à chaque redimensionnement, et
  // dès que la page de référence est mesurée.
  useEffect(() => {
    if (!fitMode) return;
    applyFit();
    const el = pdfContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => applyFit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitMode, applyFit]);

  // Nouveau document : on rétablit le mode « ajuster à la largeur » et on
  // oublie les tailles mesurées du document précédent. `fitMode`/`pageSizes`
  // sont des états LOCAUX : comme la route n'est pas keyée, ce composant
  // n'est pas remonté au changement de document, donc le store ne peut pas
  // les remettre à zéro lui-même.
  useEffect(() => {
    setFitMode(true);
    setPageSizes(new Map());
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
        scrollToPage(pdfPage - 1);
      } else if (e.key === 'ArrowRight') {
        scrollToPage(pdfPage + 1);
      } else if (e.key === 'Escape' && selectionMode) {
        stopSelection();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfPage, numPages, selectionMode, stopSelection]);

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
      if (
        num &&
        !['PREAMBULE', 'SIGNATURE'].includes(num) &&
        !['TABLEAU', 'DISPOSITION', 'NOTE'].some((prefix) => num.startsWith(prefix))
      ) {
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
      scrollToPage(loc.page, 'auto');
      const timer = setTimeout(() => {
        document.getElementById(`zone-${selectedNode.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
      return () => clearTimeout(timer);
    }

    // Pas de coordonnées : on localise par le texte du PDF.
    let cancelled = false;
    setLocating(true);
    findPageForNode(selectedNode)
      .then((p) => {
        if (!cancelled && p) scrollToPage(p, 'auto');
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

  // Persiste une zone tracée sur une page (voir PdfPage) et referme le mode sélection.
  const handleZoneDrawn = (page: number, rect: { x: number; y: number; w: number; h: number }) => {
    if (!selectionTarget) return;
    updateArticle.mutate({
      id: selectionTarget.id,
      source_locator: { page, x: rect.x, y: rect.y, width: rect.w, height: rect.h },
    });
    stopSelection();
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
          <button onClick={() => scrollToPage(pdfPage - 1)} className="w-[28px] h-[28px] rounded border border-b1 bg-transparent text-t2 flex items-center justify-center hover:bg-s3 hover:border-b2 hover:text-t1 transition-colors" title="Page précédente">
            <ChevronLeft className="w-[14px] h-[14px]" />
          </button>
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={pageInputValue}
              onChange={(e) => setPageInputValue(e.target.value)}
              onBlur={commitPageInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitPageInput();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-[30px] h-[24px] bg-s2 border border-b1 rounded text-t1 text-[11px] font-mono text-center outline-none transition-colors focus:border-b3"
            />
            <span className="text-[10px] text-t3 font-mono">/ {numPages}</span>
          </div>
          <button onClick={() => scrollToPage(pdfPage + 1)} className="w-[28px] h-[28px] rounded border border-b1 bg-transparent text-t2 flex items-center justify-center hover:bg-s3 hover:border-b2 hover:text-t1 transition-colors" title="Page suivante">
            <ChevronRight className="w-[14px] h-[14px]" />
          </button>
        </div>
      </div>

      {/* PDF Content Area — défilement continu virtualisé : toutes les pages
          dans un même flux, seules celles proches de l'écran sont montées
          (@tanstack/react-virtual, comme l'arbre du viewer). */}
      <div
        ref={pdfContainerRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-auto bg-bg py-6 px-4 relative custom-scrollbar scroll-smooth",
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

        {!fileOptions && (
          <div className="flex items-center justify-center h-full w-full text-t3 text-[10px] font-mono tracking-widest uppercase">
            Aucun PDF associé
          </div>
        )}

        {fileOptions && (
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
              <div className="flex flex-col items-center justify-center h-full w-full text-t3 gap-3 py-20">
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
            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const pageNumber = virtualRow.index + 1;
                return (
                  <div
                    key={pageNumber}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      paddingBottom: PAGE_GAP,
                    }}
                  >
                    <PdfPage
                      pageNumber={pageNumber}
                      zoom={pdfZoom}
                      size={pageSizes.get(pageNumber) ?? referencePageSize}
                      zones={zonesByPage.get(pageNumber) ?? []}
                      selectedNodeId={selectedNode?.id ?? null}
                      selectionMode={selectionMode}
                      selectionTarget={selectionTarget}
                      onZoneClick={handleZoneClick}
                      onZoneDrawn={handleZoneDrawn}
                      onMeasuredSize={handleMeasuredSize}
                    />
                  </div>
                );
              })}
            </div>
          </Document>
        )}
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

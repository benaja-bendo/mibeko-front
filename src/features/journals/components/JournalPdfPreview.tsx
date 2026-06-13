import React from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { PDF_OPTIONS } from '@/shared/lib/pdfOptions';
import { getJournalPdfUrl } from '@/features/journals/api/journalsApi';
import { getStoredToken } from '@/features/auth/store/authStore';
import { ChevronLeft, ChevronRight, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

/**
 * Aperçu paginé du PDF original d'un journal officiel (proxy interne).
 * La largeur de page suit celle du conteneur (ResizeObserver).
 */
export default function JournalPdfPreview({ journalId }: { journalId: string }) {
  const [numPages, setNumPages] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [width, setWidth] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const pdfUrl = getJournalPdfUrl(journalId);
  const token = getStoredToken();

  const fileOptions = React.useMemo(() => ({
    url: pdfUrl,
    httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    withCredentials: true,
  }), [pdfUrl, token]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.floor(w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full bg-s1 border border-b1 rounded-2xl overflow-hidden">
      <div className="h-[40px] border-b border-b1 flex items-center px-3 gap-2 shrink-0">
        <span className="text-[10px] font-bold tracking-[0.05em] uppercase text-t2 font-mono flex-1">
          PDF du journal
        </span>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          className="w-[26px] h-[26px] rounded border border-b1 text-t2 flex items-center justify-center hover:bg-s3 transition-colors"
          title="Page précédente"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-t3 font-mono min-w-[52px] text-center">
          {page} / {numPages || '…'}
        </span>
        <button
          onClick={() => setPage(p => Math.min(numPages || 1, p + 1))}
          className="w-[26px] h-[26px] rounded border border-b1 text-t2 flex items-center justify-center hover:bg-s3 transition-colors"
          title="Page suivante"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-bg custom-scrollbar p-3">
        <Document
          file={fileOptions}
          options={PDF_OPTIONS}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div className="flex flex-col items-center justify-center py-16 text-t3 gap-3">
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              <span className="text-[10px] font-mono tracking-widest uppercase">Chargement</span>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <AlertCircle className="w-7 h-7 text-red mb-3 opacity-50" />
              <p className="text-red text-[11px] font-mono mb-3">PDF indisponible.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(pdfUrl, '_blank')}
                className="text-[11px]"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Ouvrir en externe
              </Button>
            </div>
          }
        >
          {width > 0 && (
            <Page
              pageNumber={page}
              width={width - 8}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="rounded shadow-lg overflow-hidden mx-auto"
            />
          )}
        </Document>
      </div>
    </div>
  );
}

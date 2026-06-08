/**
 * DossierDrawer.tsx — Panneau de détail d'un dossier.
 *
 * Regroupe les informations de l'affaire, ses références juridiques, ses pièces
 * et les documents générés. Permet de changer le statut, de générer un document,
 * et d'exporter une note de synthèse PDF (endpoint Laravel réel).
 */

import { useRef, useState } from 'react';
import {
  Scale,
  Paperclip,
  FileText,
  Trash2,
  Plus,
  Printer,
  Download,
  Loader2,
  BookOpen,
  Upload,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle } from '@/shared/components/ui/Sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { useDossiersStore } from '@/features/dossiers/store/useDossiersStore';
import {
  STATUS_META,
  STATUS_ORDER,
  type DossierStatus,
} from '@/features/dossiers/types';
import {
  exportDossierPdf,
  type DossierExportItem,
} from '@/features/dossiers/api/dossiersApi';
import {
  DOC_PRINT_STYLES,
} from '@/features/dossiers/templates/templates';
import DocumentGeneratorModal from './DocumentGeneratorModal';

interface DossierDrawerProps {
  dossierId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Formate une taille de fichier en Ko/Mo. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Ouvre une fenêtre d'impression pour un document déjà généré. */
function printHtml(title: string, html: string) {
  const win = window.open('', '_blank', 'width=800,height=1000');
  if (!win) return;
  win.document.write(
    `<!doctype html><html><head><title>${title}</title><meta charset="utf-8"/>` +
      `<style>body{margin:40px;background:#fff;}${DOC_PRINT_STYLES}</style></head>` +
      `<body>${html}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

/** Petit titre de section. */
function SectionTitle({
  icon,
  title,
  count,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-t1">
        <span className="text-gold">{icon}</span>
        {title}
        {count !== undefined && (
          <span className="rounded bg-s3 px-1.5 py-0.5 font-mono text-[10px] text-t3">
            {count}
          </span>
        )}
      </h3>
      {action}
    </div>
  );
}

export default function DossierDrawer({
  dossierId,
  open,
  onOpenChange,
}: DossierDrawerProps) {
  const navigate = useNavigate();
  const dossier = useDossiersStore((s) =>
    s.dossiers.find((d) => d.id === dossierId),
  );
  const setStatus = useDossiersStore((s) => s.setStatus);
  const removeReference = useDossiersStore((s) => s.removeReference);
  const addPiece = useDossiersStore((s) => s.addPiece);
  const removePiece = useDossiersStore((s) => s.removePiece);
  const removeDocument = useDossiersStore((s) => s.removeDocument);
  const deleteDossier = useDossiersStore((s) => s.deleteDossier);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!dossier) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) =>
      addPiece(dossier.id, {
        name: file.name,
        size: file.size,
        mime: file.type || 'application/octet-stream',
      }),
    );
  };

  const handleExport = async () => {
    setExportError(null);
    const items: DossierExportItem[] = dossier.references.map((r) => ({
      type: r.type,
      id: r.id,
      note: r.note ?? null,
    }));

    if (items.length === 0) {
      setExportError('Ajoutez au moins une référence juridique depuis la Bibliothèque.');
      return;
    }

    setExporting(true);
    try {
      await exportDossierPdf({
        title: dossier.title,
        description: dossier.description,
        items,
      });
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Échec de l\'export PDF.',
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = () => {
    deleteDossier(dossier.id);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-none md:w-[560px]"
        >
          <SheetTitle className="sr-only">{dossier.title}</SheetTitle>

          {/* En-tête */}
          <header className="shrink-0 border-b border-b1 p-4 pr-12">
            <div className="flex items-center gap-2">
              {dossier.reference && (
                <span className="rounded bg-s3 px-1.5 py-0.5 font-mono text-[10px] text-t2">
                  {dossier.reference}
                </span>
              )}
              <Select
                value={dossier.status}
                onValueChange={(v) => setStatus(dossier.id, v as DossierStatus)}
              >
                <SelectTrigger className="h-7 w-auto gap-2 border-b1 bg-s2 px-2 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${STATUS_META[status].dot}`}
                        />
                        {STATUS_META[status].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <h2 className="mt-2 font-display text-lg font-semibold leading-tight text-t1">
              {dossier.title}
            </h2>
            {(dossier.client || dossier.adverse) && (
              <p className="mt-1 text-xs text-t3">
                {dossier.client}
                {dossier.adverse ? ` c/ ${dossier.adverse}` : ''}
              </p>
            )}
          </header>

          {/* Corps défilable */}
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
            {/* Métadonnées */}
            {(dossier.jurisdiction || dossier.description) && (
              <div className="space-y-2 rounded-lg border border-b1 bg-s1 p-3">
                {dossier.jurisdiction && (
                  <div className="flex items-start gap-2 text-xs">
                    <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-t3" />
                    <span className="text-t2">{dossier.jurisdiction}</span>
                  </div>
                )}
                {dossier.description && (
                  <p className="text-xs leading-relaxed text-t2">
                    {dossier.description}
                  </p>
                )}
              </div>
            )}

            {/* Références juridiques */}
            <section>
              <SectionTitle
                icon={<BookOpen className="h-3.5 w-3.5" />}
                title="Références juridiques"
                count={dossier.references.length}
                action={
                  <button
                    type="button"
                    onClick={() => navigate(`/app/library?addTo=${dossier.id}`)}
                    className="flex items-center gap-1 rounded text-[11px] font-medium text-gold hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Bibliothèque
                  </button>
                }
              />
              {dossier.references.length === 0 ? (
                <p className="rounded-lg border border-dashed border-b2 px-3 py-4 text-center text-[11px] text-t3">
                  Aucune référence. Ajoutez des articles depuis la Bibliothèque.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {dossier.references.map((ref) => (
                    <li
                      key={ref.id}
                      className="group flex items-start gap-2 rounded-lg border border-b1 bg-s1 p-2.5"
                    >
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-t1">
                          {ref.title}
                          {ref.number ? ` · Art. ${ref.number}` : ''}
                        </p>
                        {ref.breadcrumb && (
                          <p className="truncate font-mono text-[10px] text-t3">
                            {ref.breadcrumb}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeReference(dossier.id, ref.id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-t3 opacity-0 transition-opacity hover:bg-s3 hover:text-red group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Pièces */}
            <section>
              <SectionTitle
                icon={<Paperclip className="h-3.5 w-3.5" />}
                title="Pièces"
                count={dossier.pieces.length}
                action={
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 rounded text-[11px] font-medium text-gold hover:underline"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Ajouter
                  </button>
                }
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              {dossier.pieces.length === 0 ? (
                <p className="rounded-lg border border-dashed border-b2 px-3 py-4 text-center text-[11px] text-t3">
                  Aucune pièce versée.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {dossier.pieces.map((piece) => (
                    <li
                      key={piece.id}
                      className="group flex items-center gap-2 rounded-lg border border-b1 bg-s1 p-2.5"
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-t3" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-t1">{piece.name}</p>
                        <p className="font-mono text-[10px] text-t3">
                          {formatSize(piece.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePiece(dossier.id, piece.id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-t3 opacity-0 transition-opacity hover:bg-s3 hover:text-red group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Documents générés */}
            <section>
              <SectionTitle
                icon={<FileText className="h-3.5 w-3.5" />}
                title="Documents"
                count={dossier.documents.length}
                action={
                  <button
                    type="button"
                    onClick={() => setGeneratorOpen(true)}
                    className="flex items-center gap-1 rounded text-[11px] font-medium text-gold hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Générer
                  </button>
                }
              />
              {dossier.documents.length === 0 ? (
                <p className="rounded-lg border border-dashed border-b2 px-3 py-4 text-center text-[11px] text-t3">
                  Générez une mise en demeure, des statuts, un contrat…
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {dossier.documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="group flex items-center gap-2 rounded-lg border border-b1 bg-s1 p-2.5"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-gold" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-t1">
                          {doc.title}
                        </p>
                        <p className="font-mono text-[10px] text-t3">
                          {doc.templateName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => printHtml(doc.title, doc.html)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-t3 hover:bg-s3 hover:text-t1"
                        title="Imprimer / PDF"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDocument(dossier.id, doc.id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-t3 opacity-0 transition-opacity hover:bg-s3 hover:text-red group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Pied : actions */}
          <footer className="shrink-0 space-y-2 border-t border-b1 p-3">
            {exportError && (
              <p className="rounded-md bg-red-d px-3 py-2 text-[11px] text-red">
                {exportError}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="gold"
                className="flex-1"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exporter la synthèse PDF
              </Button>
              <Button
                variant="danger"
                size="icon"
                onClick={handleDelete}
                title="Supprimer le dossier"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </footer>
        </SheetContent>
      </Sheet>

      <DocumentGeneratorModal
        dossierId={dossier.id}
        open={generatorOpen}
        onOpenChange={setGeneratorOpen}
      />
    </>
  );
}

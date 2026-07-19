/**
 * DocumentGeneratorModal.tsx — Génération de documents depuis des modèles.
 *
 * Deux étapes : choix du modèle, puis saisie des champs avec aperçu en direct.
 * Le document peut être imprimé (export PDF via le navigateur) ou enregistré
 * dans le dossier.
 */

import { useMemo, useState } from 'react';
import { ArrowLeft, FileText, Printer, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { useDossierAnnexes } from '@/features/dossiers/store/useDossierAnnexes';
import {
  DOC_PRINT_STYLES,
  TEMPLATES,
  esc,
  type DocumentTemplate,
} from '@/features/dossiers/templates/templates';

interface DocumentGeneratorModalProps {
  dossierId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Initialise les valeurs d'un modèle avec ses valeurs par défaut. */
function initialValues(template: DocumentTemplate): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of template.fields) {
    values[field.key] = field.defaultValue ?? '';
  }
  return values;
}

/** Ouvre une fenêtre d'impression avec le document mis en forme. */
function printDocument(title: string, html: string) {
  const win = window.open('', '_blank', 'width=800,height=1000');
  if (!win) return;
  // Le titre vient des saisies utilisateur : on l'échappe avant injection.
  win.document.write(
    `<!doctype html><html><head><title>${esc(title)}</title><meta charset="utf-8"/>` +
      `<style>body{margin:40px;background:#fff;}${DOC_PRINT_STYLES}</style></head>` +
      `<body>${html}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

export default function DocumentGeneratorModal({
  dossierId,
  open,
  onOpenChange,
}: DocumentGeneratorModalProps) {
  const addDocument = useDossierAnnexes((s) => s.addDocument);
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const built = useMemo(
    () => (template ? template.build(values) : null),
    [template, values],
  );

  const selectTemplate = (t: DocumentTemplate) => {
    setTemplate(t);
    setValues(initialValues(t));
  };

  const reset = () => {
    setTemplate(null);
    setValues({});
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSave = () => {
    if (!template || !built) return;
    addDocument(dossierId, {
      templateId: template.id,
      templateName: template.name,
      title: built.title,
      html: built.html,
    });
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[88vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {template && (
              <button
                type="button"
                onClick={reset}
                className="flex h-6 w-6 items-center justify-center rounded text-t3 hover:bg-s2 hover:text-t1"
                title="Changer de modèle"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {template ? template.name : 'Générer un document'}
          </DialogTitle>
          <DialogDescription>
            {template
              ? template.description
              : 'Choisissez un modèle à compléter.'}
          </DialogDescription>
        </DialogHeader>

        {/* Étape 1 : sélection du modèle */}
        {!template && (
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTemplate(t)}
                className="flex flex-col gap-1 rounded-xl border border-b1 bg-s2 p-4 text-left transition-colors hover:border-gold/30 hover:bg-s3"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-t1">
                  <FileText className="h-4 w-4 text-gold" />
                  {t.name}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wide text-t3">
                  {t.category}
                </span>
                <span className="mt-1 text-xs leading-snug text-t2">
                  {t.description}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Étape 2 : formulaire + aperçu */}
        {template && built && (
          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
            {/* Formulaire */}
            <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
              {template.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key}>
                    {field.label}
                    {field.required && ' *'}
                  </Label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.key}
                      value={values[field.key] ?? ''}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.key]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full resize-none rounded-md border border-b1 bg-s2 px-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:ring-1 focus:ring-gold"
                    />
                  ) : (
                    <Input
                      id={field.key}
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={values[field.key] ?? ''}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.key]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Aperçu */}
            <div className="min-h-0 overflow-y-auto rounded-lg border border-b1 bg-white p-5">
              <style>{DOC_PRINT_STYLES}</style>
              {/* Contenu généré par nos modèles (saisies échappées) — sûr. */}
              <div dangerouslySetInnerHTML={{ __html: built.html }} />
            </div>
          </div>
        )}

        {/* Actions */}
        {template && built && (
          <div className="flex justify-end gap-2 border-t border-b1 pt-3">
            <Button
              variant="outline"
              onClick={() => printDocument(built.title, built.html)}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimer / PDF
            </Button>
            <Button variant="gold" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer au dossier
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

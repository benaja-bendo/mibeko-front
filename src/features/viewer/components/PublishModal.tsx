import { useParams } from 'react-router-dom';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';
import type { LegalDocument } from '@/shared/types/database';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { apiErrorMessage } from '@/features/documents/api/laravelApi';
import { cn } from '@/shared/lib/utils';
import { UploadCloud, CheckCircle2, Undo2, AlertTriangle } from 'lucide-react';

const WORKFLOW = [
  { id: 'draft', label: 'Brouillon' },
  { id: 'review', label: 'Révision' },
  { id: 'validated', label: 'Validé' },
  { id: 'published', label: 'Publié' },
] as const;

/**
 * Publication des corrections : passe le document en `curation_status =
 * published`, ce qui le rend visible dans le catalogue, la bibliothèque Pro
 * et l'app mobile. Permet aussi de le repasser en révision.
 */
export default function PublishModal({ document }: { document?: LegalDocument }) {
  const { id: documentId } = useParams<{ id: string }>();
  const { publishModalOpen, setPublishModalOpen } = useViewerStore();
  const { updateDocument } = useDocumentMutations(documentId || '');

  if (!document) return null;

  const current = document.curation_status || 'draft';
  const isPublished = current === 'published';
  const currentIndex = WORKFLOW.findIndex(s => s.id === current);

  const handleAction = (target: 'published' | 'review', force = false) => {
    updateDocument.mutate(
      { curation_status: target, ...(force ? { force: true } : {}) },
      { onSuccess: () => setPublishModalOpen(false) }
    );
  };

  return (
    <Dialog open={publishModalOpen} onOpenChange={setPublishModalOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-gold" />
            {isPublished ? 'Document publié' : 'Publier les corrections'}
          </DialogTitle>
          <DialogDescription>
            {isPublished
              ? 'Ce document est visible dans la bibliothèque Pro, le catalogue et l\'application mobile.'
              : 'La publication rend le document et ses articles visibles dans la bibliothèque Pro, le catalogue et l\'application mobile.'}
          </DialogDescription>
        </DialogHeader>

        {/* Workflow de curation */}
        <div className="flex items-center gap-1 py-4">
          {WORKFLOW.map((step, i) => (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center border text-[10px] font-mono font-bold transition-colors",
                    i < currentIndex && "bg-green-d text-green border-green/30",
                    i === currentIndex && "bg-gold text-on-gold border-gold shadow-[0_0_12px_rgba(200,168,106,0.4)]",
                    i > currentIndex && "bg-s2 text-t3 border-b1"
                  )}
                >
                  {i < currentIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={cn(
                  "text-[9px] font-mono uppercase tracking-wider",
                  i === currentIndex ? "text-gold font-bold" : "text-t3"
                )}>
                  {step.label}
                </span>
              </div>
              {i < WORKFLOW.length - 1 && (
                <div className={cn("h-px flex-1 mb-5", i < currentIndex ? "bg-green/30" : "bg-b1")} />
              )}
            </div>
          ))}
        </div>

        {updateDocument.isError && (
          <div className="space-y-2">
            <p className="text-red text-[11px] font-mono bg-red-d border border-red/20 rounded px-3 py-2">
              {apiErrorMessage(updateDocument.error, 'La publication a échoué. Réessayez.')}
            </p>
            {!isPublished && (
              <div className="bg-amber-d border border-amber/20 rounded px-3 py-2.5">
                <p className="text-amber text-[11px] leading-relaxed mb-2">
                  Vous pouvez publier malgré les anomalies non résolues. Le document
                  deviendra immédiatement visible dans la bibliothèque Pro, le catalogue
                  et l'application mobile — même si son contenu reste imparfait.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={updateDocument.isPending}
                  onClick={() => handleAction('published', true)}
                  className="w-full gap-2 border-amber/40 text-amber hover:bg-amber/10"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {updateDocument.isPending ? 'Publication…' : 'Publier quand même'}
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-2 gap-2">
          <Button type="button" variant="outline" onClick={() => setPublishModalOpen(false)}>
            Annuler
          </Button>
          {isPublished ? (
            <Button
              variant="outline"
              disabled={updateDocument.isPending}
              onClick={() => handleAction('review')}
              className="gap-2"
            >
              <Undo2 className="w-3.5 h-3.5" />
              {updateDocument.isPending ? 'En cours...' : 'Repasser en révision'}
            </Button>
          ) : (
            <Button
              variant="gold"
              disabled={updateDocument.isPending}
              onClick={() => handleAction('published')}
              className="gap-2"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              {updateDocument.isPending ? 'Publication...' : 'Publier maintenant'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

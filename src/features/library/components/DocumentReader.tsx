/**
 * DocumentReader.tsx — Lecteur de document en panneau latéral (mobile/tablette).
 *
 * Sur desktop, le poste de travail affiche la lecture en panneau droit inline
 * (cf. DocumentReaderView). Sur petit écran, on réutilise la même vue dans un
 * Sheet plein écran.
 */

import { Sheet, SheetContent, SheetTitle } from '@/shared/components/ui/Sheet';
import DocumentReaderView from './DocumentReaderView';

interface DocumentReaderProps {
  documentId: string | null;
  articleId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToDossier?: () => void;
  addedToDossier?: boolean;
}

export default function DocumentReader({
  documentId,
  articleId,
  open,
  onOpenChange,
  onAddToDossier,
  addedToDossier,
}: DocumentReaderProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-none md:w-[88vw]"
      >
        <SheetTitle className="sr-only">Lecture du document</SheetTitle>
        {documentId && (
          <DocumentReaderView
            documentId={documentId}
            articleId={articleId}
            onAddToDossier={onAddToDossier}
            addedToDossier={addedToDossier}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { Info, Calendar, Hash, FileText, Activity } from 'lucide-react';
import type { LegalDocument } from '@/shared/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog';

export default function DocumentInfoModal({ document }: { document?: LegalDocument }) {
  const { infoModalOpen, setInfoModalOpen } = useViewerStore();
  const legalStatus = document?.statut || document?.status || 'vigueur';

  if (!document) return null;

  return (
    <Dialog open={infoModalOpen} onOpenChange={(open) => setInfoModalOpen(open)}>
      <DialogContent className="max-w-[500px] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="h-[54px] border-b border-b1 flex flex-row items-center px-5 gap-3 shrink-0 space-y-0">
          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
            <Info className="w-4 h-4 text-gold" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <DialogTitle className="block text-[15px] font-medium text-gold leading-tight">
              Informations du document
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 bg-s1">
          <div>
            <h3 className="text-[14px] font-display font-semibold text-t1 mb-1">
              {document.title || document.titre_officiel || 'Document sans titre'}
            </h3>
            <p className="text-[12px] text-t3 font-mono">
              ID: {document.id}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-s2 rounded-lg p-3 border border-b1">
              <div className="flex items-center gap-2 mb-2 text-t3">
                <FileText className="w-4 h-4" />
                <span className="text-[10px] font-mono uppercase tracking-wider">Type</span>
              </div>
              <p className="text-[13px] text-t1 font-medium">
                {document.type?.code || document.type_code || 'Non spécifié'}
              </p>
            </div>

            <div className="bg-s2 rounded-lg p-3 border border-b1">
              <div className="flex items-center gap-2 mb-2 text-t3">
                <Hash className="w-4 h-4" />
                <span className="text-[10px] font-mono uppercase tracking-wider">Référence NOR</span>
              </div>
              <p className="text-[13px] text-t1 font-medium">
                {document.reference_nor || 'Non spécifié'}
              </p>
            </div>

            <div className="bg-s2 rounded-lg p-3 border border-b1">
              <div className="flex items-center gap-2 mb-2 text-t3">
                <Calendar className="w-4 h-4" />
                <span className="text-[10px] font-mono uppercase tracking-wider">Date de signature</span>
              </div>
              <p className="text-[13px] text-t1 font-medium">
                {document.dates?.signature || document.date_signature || 'Non spécifiée'}
              </p>
            </div>

            <div className="bg-s2 rounded-lg p-3 border border-b1">
              <div className="flex items-center gap-2 mb-2 text-t3">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-mono uppercase tracking-wider">Statut Juridique</span>
              </div>
              <p className="text-[13px] text-t1 font-medium">
                {legalStatus.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

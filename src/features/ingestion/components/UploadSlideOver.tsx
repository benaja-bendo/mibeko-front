/**
 * UploadSlideOver.tsx — Panneau coulissant de dépôt (PDF + MD/JSON).
 * Deux workflows : STOCK (texte consolidé) et FLUX (Journal Officiel).
 * Les documents déposés rejoignent la file de validation, jamais le catalogue
 * directement.
 */
import { useState } from 'react';
import { StockUploadForm } from './StockUploadForm';
import { JournalUploadForm } from './JournalUploadForm';

type UploadTab = 'stock' | 'flux';

export function UploadSlideOver({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [tab, setTab] = useState<UploadTab>('stock');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-[480px] h-full p-3 animate-in slide-in-from-right-4">
        <div className="bg-s1 border border-b1 rounded-xl overflow-hidden flex flex-col h-full shadow-2xl">
          {/* En-tête */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-b1">
            <div>
              <div className="text-t1 text-sm font-body font-semibold">Déposer des documents</div>
              <div className="text-t4 text-[10px] font-mono mt-0.5">
                Les dépôts arrivent dans la file de validation — rien n'est publié sans votre accord.
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-t3 hover:text-t1 transition-colors shrink-0 h-6 w-6 flex items-center justify-center rounded hover:bg-s3"
              title="Fermer"
            >
              ✕
            </button>
          </div>

          {/* Onglets */}
          <div className="flex border-b border-b1">
            <button
              onClick={() => setTab('stock')}
              className={[
                'flex-1 h-10 text-xs font-mono transition-colors border-b-2 -mb-px',
                tab === 'stock' ? 'text-gold border-gold/60 bg-gold/5' : 'text-t3 border-transparent hover:text-t2',
              ].join(' ')}
            >
              STOCK — Texte consolidé
            </button>
            <button
              onClick={() => setTab('flux')}
              className={[
                'flex-1 h-10 text-xs font-mono transition-colors border-b-2 -mb-px',
                tab === 'flux' ? 'text-purple border-purple/60 bg-purple/5' : 'text-t3 border-transparent hover:text-t2',
              ].join(' ')}
            >
              FLUX — Journal Officiel
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 min-h-0">
            {tab === 'stock' ? (
              <StockUploadForm onSuccess={onSuccess} />
            ) : (
              <JournalUploadForm onSuccess={onSuccess} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

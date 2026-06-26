import { useToastStore, type ToastType } from '@/shared/store/useToast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const TONE: Record<ToastType, { cls: string; Icon: typeof Info }> = {
  success: { cls: 'bg-green/10 border-green/20 text-green', Icon: CheckCircle2 },
  error: { cls: 'bg-red/10 border-red/20 text-red', Icon: AlertCircle },
  info: { cls: 'bg-blue/10 border-blue/20 text-blue', Icon: Info },
};

/**
 * Pile de toasts globale. Montée une seule fois (dans AppLayout et le Viewer
 * plein écran). En bas à droite ; pleine largeur (moins les marges) sur mobile.
 */
export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2 w-[calc(100vw-2rem)] sm:w-80 max-w-[calc(100vw-2rem)] sm:max-w-none pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const { cls, Icon } = TONE[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg border text-xs font-body shadow-xl animate-in slide-in-from-right-4 fade-in ${cls}`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="opacity-50 hover:opacity-100 shrink-0 transition-opacity"
              aria-label="Fermer la notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

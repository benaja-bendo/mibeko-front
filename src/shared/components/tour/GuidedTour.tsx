/**
 * GuidedTour.tsx — Visite guidée légère et réutilisable (zéro dépendance).
 *
 * Met en avant des éléments de la page via un « spotlight » (découpe dans un
 * voile sombre) et une bulle explicative positionnée à côté de la cible.
 *
 * Usage :
 *  1. Poser des attributs `data-tour="<cle>"` sur les éléments à présenter ;
 *  2. Décrire les étapes (`TourStep[]`) — une étape dont la cible est absente
 *     du DOM est automatiquement sautée (ex. bouton visible après recherche) ;
 *  3. Contrôler l'ouverture avec `useTourState(tourId)` (auto-démarrage à la
 *     première visite, persistance localStorage, relance manuelle) — voir
 *     `useTourState.ts`.
 */

import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

export interface TourStep {
  /** Clé de l'attribut `data-tour` de l'élément ciblé. */
  target: string;
  title: string;
  content: string;
  /** Position préférée de la bulle (défaut : bottom). */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface GuidedTourProps {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}

const SPOT_PADDING = 6;
const BUBBLE_WIDTH = 320;
const BUBBLE_MARGIN = 12;

/** Rectangle de la cible courante, suivi sur resize/scroll. */
function useTargetRect(target: string | null, active: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!active || !target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
    if (!el) {
      setRect(null);
      return;
    }

    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const update = () => setRect(el.getBoundingClientRect());
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    // `true` : capte aussi les scrolls des conteneurs internes.
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [target, active]);

  return rect;
}

/** Position de la bulle par rapport au spotlight, recadrée dans le viewport. */
function bubblePosition(
  rect: DOMRect,
  placement: TourStep['placement'] = 'bottom',
): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const style: React.CSSProperties = { position: 'fixed', width: BUBBLE_WIDTH };

  const clampX = (x: number) =>
    Math.max(BUBBLE_MARGIN, Math.min(x, vw - BUBBLE_WIDTH - BUBBLE_MARGIN));

  switch (placement) {
    case 'top':
      style.left = clampX(rect.left + rect.width / 2 - BUBBLE_WIDTH / 2);
      style.bottom = vh - rect.top + SPOT_PADDING + BUBBLE_MARGIN;
      break;
    case 'left':
      style.right = vw - rect.left + SPOT_PADDING + BUBBLE_MARGIN;
      style.top = Math.max(BUBBLE_MARGIN, rect.top);
      break;
    case 'right':
      style.left = Math.min(
        rect.right + SPOT_PADDING + BUBBLE_MARGIN,
        vw - BUBBLE_WIDTH - BUBBLE_MARGIN,
      );
      style.top = Math.max(BUBBLE_MARGIN, rect.top);
      break;
    default: // bottom
      style.left = clampX(rect.left + rect.width / 2 - BUBBLE_WIDTH / 2);
      style.top = Math.min(
        rect.bottom + SPOT_PADDING + BUBBLE_MARGIN,
        vh - BUBBLE_MARGIN - 200,
      );
  }
  return style;
}

export default function GuidedTour({ steps, open, onClose }: GuidedTourProps) {
  const [index, setIndex] = useState(0);

  // Repart de la première étape à chaque ouverture.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Ne garde que les étapes dont la cible existe réellement dans le DOM
  // (certaines n'apparaissent qu'après une recherche, sur desktop, etc.).
  const [visibleSteps, setVisibleSteps] = useState<TourStep[]>([]);
  useLayoutEffect(() => {
    if (!open) return;
    setVisibleSteps(
      steps.filter((s) =>
        document.querySelector(`[data-tour="${s.target}"]`),
      ),
    );
  }, [open, steps]);

  const step = visibleSteps[index] ?? null;
  const rect = useTargetRect(step?.target ?? null, open);

  // Navigation clavier : ← → Échap.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight')
        setIndex((i) => Math.min(i + 1, visibleSteps.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, visibleSteps.length]);

  if (!open || !step || !rect) return null;

  const isLast = index === visibleSteps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Voile cliquable (ferme la visite) + spotlight sur la cible */}
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="pointer-events-none absolute rounded-xl border-2 border-gold/80 transition-all duration-200"
        style={{
          left: rect.left - SPOT_PADDING,
          top: rect.top - SPOT_PADDING,
          width: rect.width + SPOT_PADDING * 2,
          height: rect.height + SPOT_PADDING * 2,
          boxShadow: '0 0 0 9999px rgba(0,0,0,.62)',
        }}
      />

      {/* Bulle */}
      <div
        className="rounded-xl border border-b1 bg-s1 p-4 shadow-2xl"
        style={bubblePosition(rect, step.placement)}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-sm font-semibold text-t1">
            {step.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la visite"
            className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-t3 transition-colors hover:bg-s2 hover:text-t1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="mt-1.5 text-xs leading-relaxed text-t2">{step.content}</p>

        <div className="mt-3.5 flex items-center justify-between">
          {/* Progression */}
          <div className="flex items-center gap-1">
            {visibleSteps.map((s, i) => (
              <button
                key={s.target}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Étape ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-4 bg-gold' : 'w-1.5 bg-s3 hover:bg-t4'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="flex h-7 items-center gap-1 rounded-lg border border-b1 bg-s2 px-2.5 text-[11px] font-medium text-t2 transition-colors hover:text-t1"
              >
                <ArrowLeft className="h-3 w-3" />
                Précédent
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? onClose() : setIndex((i) => i + 1))}
              className="flex h-7 items-center gap-1 rounded-lg bg-gold px-3 text-[11px] font-semibold text-on-gold transition-opacity hover:opacity-90"
            >
              {isLast ? 'Terminer' : 'Suivant'}
              {!isLast && <ArrowRight className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

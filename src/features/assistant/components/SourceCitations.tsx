/**
 * SourceCitations.tsx — « Étagère » de sources juridiques d'une réponse de l'IA.
 *
 * Les sources sont la finalité première de l'assistant : permettre à
 * l'utilisateur de RETROUVER les documents qui correspondent à son affaire.
 * On les présente donc comme une rangée horizontale de cartes parcourables
 * (style « tablette de documents ») plutôt qu'une simple liste :
 *  - défilement horizontal avec chevrons (souris/trackpad) et cartes qui
 *    dépassent pour signaler qu'il y en a davantage ;
 *  - chaque carte est cliquable et ouvre le document dans la Bibliothèque
 *    (lecteur article-focus) via les paramètres d'URL `doc` et `article` ;
 *  - le lien avec les marqueurs [n] de la réponse est précis : `scrollToSource`
 *    amène la carte n à l'écran et la met brièvement en surbrillance.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Library,
} from 'lucide-react';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/shared/components/ui/HoverCard';
import type { AssistantSource } from '@/features/assistant/types';
import { displayArticleNumber } from '@/shared/lib/legalLabels';

/** Poignée impérative : permet à un marqueur [n] de cibler une carte précise. */
export interface SourceCitationsHandle {
  scrollToSource: (index: number) => void;
}

interface SourceCitationsProps {
  sources: AssistantSource[];
}

/** Tronque un extrait pour l'aperçu d'une carte de citation. */
function snippet(text?: string | null, max = 150): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

const SourceCitations = forwardRef<SourceCitationsHandle, SourceCitationsProps>(
  ({ sources }, ref) => {
    const navigate = useNavigate();
    const scrollerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);
    const [flash, setFlash] = useState<number | null>(null);

    const updateScrollState = useCallback(() => {
      const el = scrollerRef.current;
      if (!el) return;
      setCanLeft(el.scrollLeft > 8);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    }, []);

    // Recalcule les affordances de défilement au montage et au redimensionnement.
    useEffect(() => {
      updateScrollState();
      const el = scrollerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(updateScrollState);
      ro.observe(el);
      return () => ro.disconnect();
    }, [updateScrollState, sources.length]);

    useImperativeHandle(
      ref,
      () => ({
        scrollToSource: (index: number) => {
          const card = cardRefs.current[index - 1];
          if (card) {
            card.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'center',
            });
            setFlash(index - 1);
            window.setTimeout(
              () => setFlash((f) => (f === index - 1 ? null : f)),
              1600,
            );
          } else {
            scrollerRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        },
      }),
      [],
    );

    if (!sources.length) return null;

    const scrollByCards = (dir: 1 | -1) => {
      const el = scrollerRef.current;
      if (!el) return;
      el.scrollBy({
        left: dir * Math.min(el.clientWidth * 0.8, 300),
        behavior: 'smooth',
      });
    };

    const openInLibrary = (source: AssistantSource) => {
      const params = new URLSearchParams();
      if (source.document_id) params.set('doc', source.document_id);
      if (source.id) params.set('article', source.id);
      navigate(`/app/library?${params.toString()}`);
    };

    return (
      <div className="mt-3.5">
        {/* En-tête : finalité explicite + compteur */}
        <div className="mb-2 flex items-center gap-2">
          <Library className="h-3.5 w-3.5 text-gold" />
          <span className="text-[11px] font-semibold text-t2">
            {sources.length} document{sources.length > 1 ? 's' : ''} à consulter
          </span>
          <span className="font-mono text-[10px] text-t4">
            cliquez pour ouvrir
          </span>
          <span className="h-px flex-1 bg-b1" />
        </div>

        {/* Rangée horizontale de cartes + chevrons */}
        <div className="relative">
          {canLeft && (
            <button
              type="button"
              aria-label="Sources précédentes"
              onClick={() => scrollByCards(-1)}
              className="absolute left-0 top-1/2 z-10 flex h-7 w-7 -translate-x-1 -translate-y-1/2 items-center justify-center rounded-full border border-b1 bg-bg/90 text-t2 shadow-sm backdrop-blur transition-colors hover:border-gold/40 hover:text-t1"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <div
            ref={scrollerRef}
            onScroll={updateScrollState}
            className="flex gap-2.5 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {sources.map((source, i) => (
              <HoverCard key={source.id || i} openDelay={400} closeDelay={80}>
              <HoverCardTrigger asChild>
              <button
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                type="button"
                onClick={() => openInLibrary(source)}
                className={`group flex w-[260px] shrink-0 flex-col gap-1.5 rounded-xl border bg-s1 p-3 text-left transition-all hover:border-gold/30 hover:bg-s2 ${
                  flash === i
                    ? 'border-gold/60 ring-2 ring-gold/40'
                    : 'border-b1'
                }`}
              >
                {/* Ligne badge + type + ouvrir */}
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-gold/15 px-1.5 text-[10px] font-bold text-gold">
                    {i + 1}
                  </span>
                  {source.document_type && (
                    <span className="rounded bg-s3 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-t3">
                      {source.document_type}
                    </span>
                  )}
                  {source.number && (
                    <span className="rounded bg-s3 px-1.5 py-0.5 font-mono text-[9px] text-t2">
                      Art. {displayArticleNumber(source.number)}
                    </span>
                  )}
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-t3 transition-colors group-hover:text-gold" />
                </div>

                {/* Titre du document */}
                <div className="flex items-start gap-1.5">
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                  <span className="line-clamp-2 text-xs font-semibold leading-snug text-t1">
                    {source.document_title || 'Document'}
                  </span>
                </div>

                {/* Fil d'Ariane */}
                {source.breadcrumb && (
                  <p className="truncate font-mono text-[10px] text-t3">
                    {source.breadcrumb}
                  </p>
                )}

                {/* Extrait */}
                {source.content && (
                  <p className="line-clamp-3 text-[11px] leading-snug text-t2">
                    {snippet(source.content)}
                  </p>
                )}

                {/* Pied : appel à l'action (apparaît au survol) */}
                <span className="mt-auto flex items-center gap-1 pt-1 text-[10px] font-medium text-t4 transition-colors group-hover:text-gold">
                  Ouvrir le document
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </button>
              </HoverCardTrigger>

              {/* Aperçu étendu : l'extrait complet, que la carte tronque à 3 lignes */}
              {source.content && (
                <HoverCardContent side="top" align="center" className="w-96 px-3.5 py-3">
                  <p className="mb-1.5 truncate font-mono text-[10px] text-t3">
                    {source.breadcrumb || source.document_title}
                  </p>
                  <p className="custom-scrollbar max-h-52 overflow-y-auto border-l-2 border-gold/30 pl-2.5 font-serif text-[11.5px] leading-relaxed text-t2">
                    {snippet(source.content, 700)}
                  </p>
                </HoverCardContent>
              )}
              </HoverCard>
            ))}
          </div>

          {canRight && (
            <button
              type="button"
              aria-label="Sources suivantes"
              onClick={() => scrollByCards(1)}
              className="absolute right-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 translate-x-1 items-center justify-center rounded-full border border-b1 bg-bg/90 text-t2 shadow-sm backdrop-blur transition-colors hover:border-gold/40 hover:text-t1"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  },
);

SourceCitations.displayName = 'SourceCitations';
export default SourceCitations;

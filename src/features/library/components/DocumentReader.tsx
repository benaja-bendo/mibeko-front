/**
 * DocumentReader.tsx — Lecteur read-only d'un document juridique.
 *
 * Réutilise le hook de données du viewer (`useDocumentData`) et la mise en page
 * redimensionnable (`Resizable`) pour offrir une lecture approfondie et confortable :
 *  - panneau gauche : table des matières (structure du texte) ;
 *  - panneau droit  : colonne de lecture typographique (titres + articles) ;
 *  - l'article cité est surligné et amené à l'écran automatiquement.
 *
 * Note : on n'embarque pas le `PdfViewer` (couplé à l'édition) ; le PDF original
 * reste accessible en un clic via un lien externe.
 */

import { useEffect, useMemo, useRef } from 'react';
import { ExternalLink, MessageSquarePlus, Loader2, FileWarning } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/shared/components/ui/Sheet';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/shared/components/ui/Resizable';
import { useDocumentData } from '@/features/documents/hooks/useDocumentData';
import type { TreeNode } from '@/shared/types/database';

interface DocumentReaderProps {
  documentId: string | null;
  /** Article à surligner / amener à l'écran (optionnel). */
  articleId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Aplati l'arbre en séquence ordonnée pour le rendu en colonne de lecture. */
function flattenTree(nodes: TreeNode[], depth = 0): { node: TreeNode; depth: number }[] {
  const out: { node: TreeNode; depth: number }[] = [];
  for (const node of nodes) {
    out.push({ node, depth });
    if (node.children?.length) {
      out.push(...flattenTree(node.children, depth + 1));
    }
  }
  return out;
}

/** Entrée de table des matières (récursive). */
function TocEntry({
  node,
  depth,
  activeId,
  onJump,
}: {
  node: TreeNode;
  depth: number;
  activeId?: string | null;
  onJump: (id: string) => void;
}) {
  const isArticle = node.type === 'ARTICLE';
  const isActive = node.id === activeId;
  const label = isArticle
    ? `Art. ${node.numero ?? ''}`
    : `${node.numero ? `${node.numero}. ` : ''}${node.label ?? node.type}`;

  return (
    <>
      <button
        type="button"
        onClick={() => onJump(node.id)}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        className={`block w-full truncate rounded py-1 pr-2 text-left text-[11px] transition-colors hover:bg-s2 ${
          isActive
            ? 'bg-gold/10 font-medium text-gold'
            : isArticle
              ? 'text-t3'
              : 'font-medium text-t2'
        }`}
        title={label}
      >
        {label}
      </button>
      {node.children?.map((child) => (
        <TocEntry
          key={child.id}
          node={child}
          depth={depth + 1}
          activeId={activeId}
          onJump={onJump}
        />
      ))}
    </>
  );
}

export default function DocumentReader({
  documentId,
  articleId,
  open,
  onOpenChange,
}: DocumentReaderProps) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useDocumentData(documentId ?? '');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Les ids sont normalisés en minuscules par useDocumentData.
  const targetId = articleId?.toLowerCase() ?? null;

  const flat = useMemo(() => (data ? flattenTree(data.tree) : []), [data]);

  // Amène l'article cité à l'écran une fois le document chargé.
  useEffect(() => {
    if (!open || !targetId || !data) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`reader-node-${targetId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => clearTimeout(timer);
  }, [open, targetId, data]);

  const doc = data?.document;
  const title = doc?.titre_officiel || doc?.title || 'Document';
  const pdfUrl = data?.pdfUrl;

  const jumpTo = (id: string) => {
    const el = document.getElementById(`reader-node-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-none md:w-[78vw] lg:w-[940px]"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>

        {/* En-tête */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-b1 px-4 py-3 pr-12">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-t3">
              Bibliothèque · Lecture
            </p>
            <h2 className="truncate font-display text-base font-semibold text-t1">
              {title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {documentId && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/app/assistant?q=${encodeURIComponent(`Explique le document : ${title}`)}`,
                  )
                }
                className="flex h-8 items-center gap-1.5 rounded-lg border border-b1 bg-s1 px-2.5 text-[11px] font-medium text-t2 transition-colors hover:bg-s2 hover:text-t1"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Demander à l'IA</span>
              </button>
            )}
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-b1 bg-s1 px-2.5 text-[11px] font-medium text-t2 transition-colors hover:bg-s2 hover:text-t1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">PDF original</span>
              </a>
            )}
          </div>
        </header>

        {/* Corps */}
        <div className="min-h-0 flex-1">
          {isLoading && (
            <div className="flex h-full items-center justify-center gap-2 text-t3">
              <Loader2 className="h-5 w-5 animate-spin text-gold" />
              <span className="text-sm">Chargement du document…</span>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-t3">
              <FileWarning className="h-7 w-7 text-red" />
              <p className="text-sm">Impossible de charger ce document.</p>
            </div>
          )}

          {data && !isLoading && (
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Table des matières */}
              <ResizablePanel
                defaultSize={26}
                minSize={18}
                maxSize={40}
                className="hidden md:block"
              >
                <div className="h-full overflow-y-auto bg-s1 py-3">
                  <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-widest text-t4">
                    Sommaire
                  </p>
                  {data.tree.map((node) => (
                    <TocEntry
                      key={node.id}
                      node={node}
                      depth={0}
                      activeId={targetId}
                      onJump={jumpTo}
                    />
                  ))}
                </div>
              </ResizablePanel>

              <ResizableHandle className="hidden md:flex" />

              {/* Colonne de lecture */}
              <ResizablePanel defaultSize={74}>
                <div ref={scrollRef} className="h-full overflow-y-auto bg-bg">
                  <article className="mx-auto max-w-3xl px-6 py-8">
                    {flat.length === 0 && (
                      <p className="text-sm text-t3">
                        Le contenu structuré de ce document n'est pas encore
                        disponible. Consultez le PDF original.
                      </p>
                    )}

                    {flat.map(({ node, depth }) => {
                      const isArticle = node.type === 'ARTICLE';
                      const isTarget = node.id === targetId;

                      if (isArticle) {
                        return (
                          <section
                            key={node.id}
                            id={`reader-node-${node.id}`}
                            className={`mb-5 scroll-mt-4 rounded-lg border p-4 transition-colors ${
                              isTarget
                                ? 'border-gold/40 bg-gold/[0.06]'
                                : 'border-transparent'
                            }`}
                          >
                            <h4 className="mb-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-gold">
                              Article {node.numero}
                            </h4>
                            <p className="whitespace-pre-wrap text-[15px] leading-7 text-t1/90">
                              {node.content || '—'}
                            </p>
                          </section>
                        );
                      }

                      // Nœud de structure (Titre, Chapitre, Section…)
                      const HeadingSize =
                        depth === 0
                          ? 'text-xl'
                          : depth === 1
                            ? 'text-lg'
                            : 'text-base';
                      return (
                        <h3
                          key={node.id}
                          id={`reader-node-${node.id}`}
                          className={`mb-3 mt-7 scroll-mt-4 border-b border-b1 pb-2 font-display font-semibold text-t1 ${HeadingSize}`}
                        >
                          {node.numero ? `${node.numero}. ` : ''}
                          {node.label}
                        </h3>
                      );
                    })}
                  </article>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

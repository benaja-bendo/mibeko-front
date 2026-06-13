/**
 * DocumentReaderView.tsx — Vue de lecture adaptative d'un document juridique.
 *
 * Deux modes pilotés par l'utilisateur :
 *  - **Article** (défaut au clic sur un résultat) : l'article seul, en grand,
 *    avec navigation Précédent / Suivant dans l'ordre du document ;
 *  - **Document** : lecture complète (sommaire + colonne typographique).
 *
 * Utilisé dans le panneau droit du poste de travail (desktop) et dans un Sheet
 * (mobile). Toutes les actions pointent vers de vrais endpoints Laravel :
 *  - PDF source : `/legal-documents/{id}/pdf`
 *  - PDF Mibeko : `/legal-documents/{id}/export`
 *  - JSON sync  : `/legal-documents/{id}/download`
 */

import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  FileDown,
  Braces,
  MessageSquarePlus,
  FolderPlus,
  Check,
  Loader2,
  FileWarning,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  List,
  Sparkles,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/shared/components/ui/Resizable';
import { useDocumentData } from '@/features/documents/hooks/useDocumentData';
import {
  sourcePdfUrl,
  mibekoPdfUrl,
  jsonExportUrl,
  journalPdfUrl,
} from '@/features/library/api/libraryApi';
import { SCOPE_LABELS, type LegalScope } from '@/features/library/types';
import type { TreeNode } from '@/shared/types/database';

interface DocumentReaderViewProps {
  documentId: string;
  articleId?: string | null;
  /** Demande une explication IA de l'article lu (panneau droit). */
  onExplainArticle?: (payload: {
    articleId: string;
    documentTitle: string;
    articleNumber?: string | null;
  }) => void;
  /** Ferme (replie) le panneau de lecture. Affiche un bouton X dans l'en-tête. */
  onClose?: () => void;
  /** Active le raccourci Échap pour fermer (desktop ; mobile = Sheet Radix). */
  closeOnEscape?: boolean;
  /** Ajout de tout le document comme référence à un dossier (mode dossier). */
  onAddToDossier?: () => void;
  addedToDossier?: boolean;
}

/** Aplati l'arbre en séquence ordonnée pour le rendu en colonne de lecture. */
function flattenTree(
  nodes: TreeNode[],
  depth = 0,
): { node: TreeNode; depth: number }[] {
  const out: { node: TreeNode; depth: number }[] = [];
  for (const node of nodes) {
    out.push({ node, depth });
    if (node.children?.length) out.push(...flattenTree(node.children, depth + 1));
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

/** Bouton d'action rapide de la barre d'outils. */
function ActionButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors ${
        active
          ? 'border-green/30 bg-green-d text-green'
          : 'border-b1 bg-s1 text-t2 hover:border-gold/30 hover:text-t1'
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

export default function DocumentReaderView({
  documentId,
  articleId,
  onExplainArticle,
  onClose,
  closeOnEscape,
  onAddToDossier,
  addedToDossier,
}: DocumentReaderViewProps) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useDocumentData(documentId);

  // Les ids sont normalisés en minuscules par useDocumentData.
  const targetId = articleId?.toLowerCase() ?? null;
  const flat = useMemo(() => (data ? flattenTree(data.tree) : []), [data]);
  // Séquence ordonnée des articles, pour la navigation Précédent / Suivant.
  const articleSequence = useMemo(
    () => flat.filter((f) => f.node.type === 'ARTICLE').map((f) => f.node),
    [flat],
  );

  // Mode d'affichage + article courant (focus). Réinitialisés quand la
  // sélection change (nouveau document ou nouvel article cité).
  const [view, setView] = useState<'article' | 'document'>(
    articleId ? 'article' : 'document',
  );
  const [currentId, setCurrentId] = useState<string | null>(targetId);

  useEffect(() => {
    setView(articleId ? 'article' : 'document');
    setCurrentId(articleId?.toLowerCase() ?? null);
  }, [articleId, documentId]);

  // Échap ferme la lecture (desktop). Ignoré quand le focus est dans un champ
  // de saisie pour ne pas entrer en conflit avec la barre de recherche.
  useEffect(() => {
    if (!closeOnEscape || !onClose) {
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        return;
      }
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.isContentEditable)
      ) {
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeOnEscape, onClose]);

  const doc = data?.document;
  const title = doc?.titre_officiel || doc?.title || 'Document';
  const scope = (doc?.legal_scope as LegalScope) ?? null;

  const currentArticle = useMemo(
    () =>
      articleSequence.find((n) => n.id === currentId) ??
      articleSequence[0] ??
      null,
    [articleSequence, currentId],
  );
  const currentIndex = currentArticle
    ? articleSequence.findIndex((n) => n.id === currentArticle.id)
    : -1;
  const prevArticle = currentIndex > 0 ? articleSequence[currentIndex - 1] : null;
  const nextArticle =
    currentIndex >= 0 && currentIndex < articleSequence.length - 1
      ? articleSequence[currentIndex + 1]
      : null;

  // En mode Document, amène l'article courant à l'écran.
  useEffect(() => {
    if (view !== 'document' || !currentArticle || !data) return;
    const timer = setTimeout(() => {
      document
        .getElementById(`reader-node-${currentArticle.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => clearTimeout(timer);
  }, [view, currentArticle, data]);

  const jumpTo = (id: string) => {
    document
      .getElementById(`reader-node-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Garde le focus article synchronisé si l'on clique un article du sommaire.
    if (articleSequence.some((n) => n.id === id)) setCurrentId(id);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-t3">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
        <span className="text-sm">Chargement du document…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-t3">
        <FileWarning className="h-7 w-7 text-red" />
        <p className="text-sm">Impossible de charger ce document.</p>
      </div>
    );
  }

  const hasArticles = articleSequence.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* En-tête + actions */}
      <header className="shrink-0 border-b border-b1 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-t3">
              Lecture · {scope && scope !== 'all' ? SCOPE_LABELS[scope] : 'Document'}
            </p>
            <h2 className="truncate font-display text-base font-semibold text-t1">
              {title}
            </h2>
            {doc?.official_journal && (
              <button
                type="button"
                onClick={() => window.open(journalPdfUrl(doc.official_journal!.id), '_blank')}
                title="Ouvrir le PDF du journal officiel"
                className="mt-1 inline-flex max-w-full items-center gap-1.5 font-mono text-[10px] text-t3 transition-colors hover:text-gold"
              >
                <BookOpenText className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  Paru au {doc.official_journal.title || 'Journal Officiel'}
                  {doc.official_journal.publication_date
                    ? ` du ${doc.official_journal.publication_date.slice(0, 10)}`
                    : ''}
                </span>
              </button>
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Fermer la lecture (Échap)"
              aria-label="Fermer la lecture"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-t3 transition-colors hover:bg-s2 hover:text-t1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <ActionButton
            icon={<FileText className="h-3.5 w-3.5" />}
            label="PDF source"
            onClick={() => window.open(sourcePdfUrl(documentId), '_blank')}
          />
          <ActionButton
            icon={<FileDown className="h-3.5 w-3.5" />}
            label="PDF Mibeko"
            onClick={() => window.open(mibekoPdfUrl(documentId), '_blank')}
          />
          <ActionButton
            icon={<Braces className="h-3.5 w-3.5" />}
            label="JSON"
            onClick={() => window.open(jsonExportUrl(documentId), '_blank')}
          />
          <ActionButton
            icon={<MessageSquarePlus className="h-3.5 w-3.5" />}
            label="Assistant"
            onClick={() =>
              navigate(
                `/app/assistant?q=${encodeURIComponent(`Explique le document : ${title}`)}`,
              )
            }
          />
          {onAddToDossier && (
            <ActionButton
              icon={
                addedToDossier ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <FolderPlus className="h-3.5 w-3.5" />
                )
              }
              label={addedToDossier ? 'Ajouté' : 'Au dossier'}
              onClick={onAddToDossier}
              active={addedToDossier}
            />
          )}
        </div>
      </header>

      {/* Sous-barre : bascule Article / Document + navigation entre articles */}
      {hasArticles && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-b1 bg-s1/40 px-3 py-1.5">
          <div className="flex items-center rounded-lg border border-b1 bg-s1 p-0.5">
            <button
              type="button"
              onClick={() => setView('article')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                view === 'article' ? 'bg-gold/15 text-gold' : 'text-t3 hover:text-t1'
              }`}
            >
              <FileText className="h-3 w-3" />
              Article
            </button>
            <button
              type="button"
              onClick={() => setView('document')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                view === 'document' ? 'bg-s3 text-t1' : 'text-t3 hover:text-t1'
              }`}
            >
              <List className="h-3 w-3" />
              Document
            </button>
          </div>

          {view === 'article' && currentArticle && (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-t3">
                {currentIndex + 1} / {articleSequence.length}
              </span>
              <button
                type="button"
                onClick={() => prevArticle && setCurrentId(prevArticle.id)}
                disabled={!prevArticle}
                title="Article précédent"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-b1 bg-s1 text-t2 transition-colors hover:text-t1 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => nextArticle && setCurrentId(nextArticle.id)}
                disabled={!nextArticle}
                title="Article suivant"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-b1 bg-s1 text-t2 transition-colors hover:text-t1 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Corps */}
      <div className="min-h-0 flex-1">
        {/* ── Mode Article : l'article seul, en focus ─────────────────────── */}
        {view === 'article' && (
          <div className="h-full overflow-y-auto bg-bg">
            <article className="mx-auto max-w-3xl px-6 py-8">
              {currentArticle ? (
                <>
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-t4">
                    {title}
                  </p>
                  <h3 className="mb-3 font-mono text-sm font-semibold uppercase tracking-wide text-gold">
                    Article {currentArticle.numero}
                  </h3>
                  <p className="whitespace-pre-wrap text-[15px] leading-7 text-t1/90">
                    {currentArticle.content || '—'}
                  </p>

                  {onExplainArticle && (
                    <button
                      type="button"
                      onClick={() =>
                        onExplainArticle({
                          articleId: currentArticle.id,
                          documentTitle: title,
                          articleNumber: currentArticle.numero,
                        })
                      }
                      className="mt-5 flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/15"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Expliquer cet article avec l'IA
                    </button>
                  )}

                  {/* Navigation bas de page */}
                  <div className="mt-8 flex items-center justify-between gap-3 border-t border-b1 pt-4">
                    <button
                      type="button"
                      onClick={() => prevArticle && setCurrentId(prevArticle.id)}
                      disabled={!prevArticle}
                      className="flex items-center gap-1.5 rounded-lg border border-b1 bg-s1 px-2.5 py-1.5 text-[11px] font-medium text-t2 transition-colors hover:text-t1 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Précédent
                    </button>
                    <button
                      type="button"
                      onClick={() => setView('document')}
                      className="flex items-center gap-1.5 rounded-lg border border-b1 bg-s1 px-2.5 py-1.5 text-[11px] font-medium text-t2 transition-colors hover:border-gold/30 hover:text-t1"
                    >
                      <List className="h-3.5 w-3.5" />
                      Lire tout le document
                    </button>
                    <button
                      type="button"
                      onClick={() => nextArticle && setCurrentId(nextArticle.id)}
                      disabled={!nextArticle}
                      className="flex items-center gap-1.5 rounded-lg border border-b1 bg-s1 px-2.5 py-1.5 text-[11px] font-medium text-t2 transition-colors hover:text-t1 disabled:opacity-40"
                    >
                      Suivant
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <BookOpenText className="h-7 w-7 text-t3" />
                  <p className="text-sm text-t3">
                    Le contenu structuré n'est pas encore disponible.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.open(sourcePdfUrl(documentId), '_blank')}
                    className="mt-1 text-xs font-medium text-gold hover:underline"
                  >
                    Consulter le PDF source
                  </button>
                </div>
              )}
            </article>
          </div>
        )}

        {/* ── Mode Document : sommaire + colonne de lecture complète ───────── */}
        {view === 'document' && (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel
              defaultSize={28}
              minSize={18}
              maxSize={42}
              className="hidden lg:block"
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
                    activeId={currentArticle?.id ?? null}
                    onJump={jumpTo}
                  />
                ))}
              </div>
            </ResizablePanel>

            <ResizableHandle className="hidden lg:flex" />

            <ResizablePanel defaultSize={72}>
              <div className="h-full overflow-y-auto bg-bg">
                <article className="mx-auto max-w-3xl px-6 py-8">
                  {flat.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                      <BookOpenText className="h-7 w-7 text-t3" />
                      <p className="text-sm text-t3">
                        Le contenu structuré n'est pas encore disponible.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          window.open(sourcePdfUrl(documentId), '_blank')
                        }
                        className="mt-1 text-xs font-medium text-gold hover:underline"
                      >
                        Consulter le PDF source
                      </button>
                    </div>
                  )}

                  {flat.map(({ node, depth }) => {
                    const isArticle = node.type === 'ARTICLE';
                    const isTarget = node.id === currentArticle?.id;

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
    </div>
  );
}

/**
 * DocumentReaderView.tsx — Vue de lecture inline d'un document juridique.
 *
 * Contenu réutilisable (sans habillage modal) : barre d'actions rapides +
 * vue scindée TOC / colonne de lecture typographique. Utilisé dans le panneau
 * droit du poste de travail (desktop) et dans un Sheet (mobile).
 *
 * Toutes les actions pointent vers de vrais endpoints Laravel :
 *  - PDF source   : `/legal-documents/{id}/pdf`
 *  - PDF Mibeko   : `/legal-documents/{id}/export`
 *  - JSON sync    : `/legal-documents/{id}/download`
 */

import { useEffect, useMemo } from 'react';
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
} from '@/features/library/api/libraryApi';
import { SCOPE_LABELS, type LegalScope } from '@/features/library/types';
import type { TreeNode } from '@/shared/types/database';

interface DocumentReaderViewProps {
  documentId: string;
  articleId?: string | null;
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
  onAddToDossier,
  addedToDossier,
}: DocumentReaderViewProps) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useDocumentData(documentId);

  // Les ids sont normalisés en minuscules par useDocumentData.
  const targetId = articleId?.toLowerCase() ?? null;
  const flat = useMemo(() => (data ? flattenTree(data.tree) : []), [data]);

  const doc = data?.document;
  const title = doc?.titre_officiel || doc?.title || 'Document';
  const scope = (doc?.legal_scope as LegalScope) ?? null;

  // Amène l'article cité à l'écran une fois le document chargé.
  useEffect(() => {
    if (!targetId || !data) return;
    const timer = setTimeout(() => {
      document
        .getElementById(`reader-node-${targetId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => clearTimeout(timer);
  }, [targetId, data]);

  const jumpTo = (id: string) =>
    document
      .getElementById(`reader-node-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
          </div>
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

      {/* Corps : TOC + lecture */}
      <div className="min-h-0 flex-1">
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
                  activeId={targetId}
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
                      onClick={() => window.open(sourcePdfUrl(documentId), '_blank')}
                      className="mt-1 text-xs font-medium text-gold hover:underline"
                    >
                      Consulter le PDF source
                    </button>
                  </div>
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
      </div>
    </div>
  );
}

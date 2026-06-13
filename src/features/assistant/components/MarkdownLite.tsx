/**
 * MarkdownLite.tsx — Rendu Markdown minimaliste et sûr pour les réponses de l'IA.
 *
 * Pourquoi maison plutôt qu'une dépendance : on garde un contrôle total sur la
 * typographie (lecture de longs textes juridiques sans fatigue) et on évite tout
 * `dangerouslySetInnerHTML` — le texte est transformé en nœuds React, donc sans
 * risque d'injection.
 *
 * Gère : titres (#, ##, ###), listes (- / 1.), gras (**), italique (*),
 * code en ligne (`), et marqueurs de citation [n] rendus cliquables.
 */

import React from 'react';

interface MarkdownLiteProps {
  content: string;
  /** Appelé au clic sur un marqueur de citation [n] (n = numéro 1-based). */
  onCitationClick?: (index: number) => void;
  /**
   * Permet d'envelopper le marqueur [n] (ex. aperçu au survol) : reçoit le
   * numéro et le bouton par défaut, retourne le nœud à rendre.
   */
  renderCitation?: (index: number, marker: React.ReactElement) => React.ReactNode;
  className?: string;
}

/** Découpe le texte en nœuds React en interprétant le formatage en ligne. */
function renderInline(
  text: string,
  keyPrefix: string,
  onCitationClick?: (index: number) => void,
  renderCitation?: MarkdownLiteProps['renderCitation'],
): React.ReactNode[] {
  // On capture, dans l'ordre : **gras**, *italique*, `code`, [n] citation.
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[\d+\])/g;
  const parts = text.split(pattern);

  return parts.filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={key} className="font-semibold text-t1">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={key} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={key}
          className="rounded bg-s3 px-1.5 py-0.5 font-mono text-[0.85em] text-gold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    // Marqueur de citation [n] — bouton cliquable renvoyant vers la source n.
    const citationMatch = part.match(/^\[(\d+)\]$/);
    if (citationMatch && onCitationClick) {
      const index = Number(citationMatch[1]);
      const marker = (
        <button
          type="button"
          onClick={() => onCitationClick(index)}
          className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-gold/15 px-1 align-text-top text-[10px] font-medium text-gold transition-colors hover:bg-gold/30"
          title={`Source ${index}`}
        >
          {index}
        </button>
      );
      return (
        <React.Fragment key={key}>
          {renderCitation ? renderCitation(index, marker) : marker}
        </React.Fragment>
      );
    }

    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

export default function MarkdownLite({
  content,
  onCitationClick,
  renderCitation,
  className = '',
}: MarkdownLiteProps) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];

  let listBuffer: { ordered: boolean; items: string[] } | null = null;

  /** Vide le tampon de liste accumulé dans un <ul>/<ol>. */
  const flushList = () => {
    if (!listBuffer) return;
    const { ordered, items } = listBuffer;
    const ListTag = ordered ? 'ol' : 'ul';
    blocks.push(
      <ListTag
        key={`list-${blocks.length}`}
        className={`my-2 space-y-1 pl-5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-t3`}
      >
        {items.map((item, i) => (
          <li key={i} className="leading-relaxed text-t2">
            {renderInline(item, `li-${blocks.length}-${i}`, onCitationClick, renderCitation)}
          </li>
        ))}
      </ListTag>,
    );
    listBuffer = null;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();

    // Listes ordonnées / non ordonnées
    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      const ordered = !!olMatch;
      const text = (ulMatch?.[1] ?? olMatch?.[1]) as string;
      if (!listBuffer || listBuffer.ordered !== ordered) {
        flushList();
        listBuffer = { ordered, items: [] };
      }
      listBuffer.items.push(text);
      return;
    }

    flushList();

    // Titres
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const sizes = ['text-base', 'text-[15px]', 'text-sm'];
      blocks.push(
        <p
          key={`h-${idx}`}
          className={`mt-3 mb-1 font-display font-semibold text-t1 ${sizes[level - 1]}`}
        >
          {renderInline(text, `h-${idx}`, onCitationClick, renderCitation)}
        </p>,
      );
      return;
    }

    // Ligne vide => séparation de paragraphe (ignorée, gérée par l'espacement)
    if (line.trim() === '') return;

    // Paragraphe standard
    blocks.push(
      <p key={`p-${idx}`} className="my-1.5 leading-relaxed text-t2">
        {renderInline(line, `p-${idx}`, onCitationClick, renderCitation)}
      </p>,
    );
  });

  flushList();

  return <div className={`text-sm ${className}`}>{blocks}</div>;
}

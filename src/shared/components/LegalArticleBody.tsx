import { articleSegments, type ApiTable } from '@/shared/lib/tables';

/**
 * Corps d'un article juridique : texte officiel et tableaux.
 *
 * Le contenu vient d'un pipeline OCR : il n'est jamais interprété comme du
 * HTML (pas de `dangerouslySetInnerHTML`). Les tableaux sont reconstruits à
 * partir de cellules de texte, seule forme sûre — cf. `shared/lib/tables.ts`
 * pour les deux origines possibles (structure d'API ou balisage hérité).
 */
interface LegalArticleBodyProps {
  content: string | null | undefined;
  tables?: ApiTable[] | null;
  /** Rendu à la place d'un contenu vide (« — » par défaut). */
  emptyLabel?: string;
  className?: string;
}

/** Cellule numérique (montant, quantité) : alignée à droite, chiffres tabulaires. */
const isNumericCell = (cell: string) => /^[\d.,\s]*\d[\d.,\s]*\s*(%|FCFA|XAF)?$/i.test(cell.trim());

export function LegalArticleBody({
  content,
  tables,
  emptyLabel = '—',
  className,
}: LegalArticleBodyProps) {
  const segments = articleSegments(content, tables);

  if (segments.length === 0) {
    return <p className="text-[15px] leading-7 text-t3">{emptyLabel}</p>;
  }

  return (
    <div className={className}>
      {segments.map((segment, index) =>
        segment.kind === 'text' ? (
          <p key={index} className="whitespace-pre-wrap text-[15px] leading-7 text-t1/90">
            {segment.text}
          </p>
        ) : (
          <figure key={index} className="my-5 first:mt-0">
            {segment.table.caption && (
              <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-t3">
                {segment.table.caption}
              </figcaption>
            )}
            {/* `tabIndex` : sans lui, un tableau plus large que la colonne n'est
                pas atteignable au clavier une fois débordé. */}
            <div
              className="overflow-x-auto rounded-lg border border-b1 bg-s1"
              tabIndex={0}
              role="region"
              aria-label={segment.table.caption ?? 'Tableau du texte officiel'}
            >
              <table className="w-full border-collapse text-[13px]">
                {segment.table.headers.length > 0 && (
                  <thead>
                    <tr className="bg-s2">
                      {segment.table.headers.map((header, column) => (
                        <th
                          key={column}
                          scope="col"
                          className="whitespace-nowrap border-b border-b1 px-3 py-2 text-left align-bottom font-semibold text-t1"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {segment.table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-b1/60 last:border-b-0">
                      {row.map((cell, column) => (
                        <td
                          key={column}
                          className={`px-3 py-1.5 align-top text-t2 ${
                            isNumericCell(cell) ? 'whitespace-nowrap text-right tabular-nums' : ''
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
        ),
      )}
    </div>
  );
}

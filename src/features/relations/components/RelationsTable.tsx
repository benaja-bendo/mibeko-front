import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import type { DocumentRelationItem, RelationType } from '../api/relationsApi';

const TYPE_LABELS: Record<RelationType, string> = {
  CREE: 'Crée',
  MODIFIE: 'Modifie',
  ABROGE: 'Abroge',
  CITE: 'Cite',
  COMPLETE: 'Complète',
  RENUMEROTE: 'Renumérote',
};

const STATUS_BADGE: Record<DocumentRelationItem['status'], string> = {
  candidate: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  confirmed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  rejected: 'text-t3 bg-s2 border-b1',
};

const STATUS_LABELS: Record<DocumentRelationItem['status'], string> = {
  candidate: 'Candidate',
  confirmed: 'Confirmée',
  rejected: 'Rejetée',
};

function TypeCell({ type }: { type: RelationType }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border text-gold bg-gold/10 border-gold/20">
      {TYPE_LABELS[type]}
    </span>
  );
}

function StatusCell({ status }: { status: DocumentRelationItem['status'] }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border ${STATUS_BADGE[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function DocumentOrArticleCell({
  document,
  article,
}: {
  document: { id: string; titre_officiel: string } | null;
  article: { id: string; numero_article: string } | null;
}) {
  if (article) {
    return (
      <Link
        to={`/editor/viewer/${document?.id ?? ''}`}
        className="text-t1 hover:text-gold transition-colors text-sm line-clamp-1 block"
      >
        Art. {article.numero_article}
        {document && <span className="text-t3 text-xs"> — {document.titre_officiel}</span>}
      </Link>
    );
  }
  if (document) {
    return (
      <Link
        to={`/editor/viewer/${document.id}`}
        className="text-t1 hover:text-gold transition-colors text-sm line-clamp-1"
      >
        {document.titre_officiel}
      </Link>
    );
  }
  return <span className="text-t4 text-xs font-mono">—</span>;
}

function ConfidenceCell({ confidence }: { confidence: number | null }) {
  if (confidence === null) return <span className="text-t4 text-xs font-mono">—</span>;
  return <span className="text-t2 font-mono text-xs">{Math.round(confidence * 100)}%</span>;
}

export default function RelationsTable({
  items,
  isLoading,
  onValidate,
  onReject,
  validatingId,
}: {
  items: DocumentRelationItem[];
  isLoading: boolean;
  onValidate: (id: string) => void;
  onReject: (item: DocumentRelationItem) => void;
  validatingId?: string;
}) {
  return (
    <div className="flex-1 overflow-auto rounded-xl border border-b1 bg-s1 min-h-0">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="bg-s2/60 sticky top-0 z-10 backdrop-blur-md">
          <tr>
            {['Type', 'Source', 'Cible', 'Confiance', 'Extrait détecté', 'Statut', ''].map((label) => (
              <th
                key={label}
                className="text-left px-4 py-3 text-t3 font-mono text-[10px] uppercase tracking-widest font-semibold border-b border-b1 whitespace-nowrap"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-b1/40">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-4">
                    <div className="h-3 bg-s2 rounded animate-pulse" style={{ width: `${50 + Math.random() * 30}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-16 text-center">
                <span className="text-t3 font-mono text-xs uppercase tracking-widest">Aucune relation à afficher</span>
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="hover:bg-s2/40 transition-colors">
                <td className="px-4 py-3 align-middle">
                  <TypeCell type={item.relation_type} />
                </td>
                <td className="px-4 py-3 align-middle max-w-xs">
                  <DocumentOrArticleCell document={item.source_document} article={item.source_article} />
                </td>
                <td className="px-4 py-3 align-middle max-w-xs">
                  <DocumentOrArticleCell document={item.target_document} article={item.target_article} />
                </td>
                <td className="px-4 py-3 align-middle">
                  <ConfidenceCell confidence={item.confidence} />
                </td>
                <td className="px-4 py-3 align-middle max-w-sm">
                  {item.meta?.extrait_source ? (
                    <p className="text-t3 text-xs line-clamp-2">{item.meta.extrait_source}</p>
                  ) : (
                    <span className="text-t4 text-xs font-mono">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-middle">
                  <StatusCell status={item.status} />
                </td>
                <td className="px-4 py-3 align-middle">
                  {item.status === 'candidate' && (
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="gold"
                        disabled={validatingId === item.id}
                        onClick={() => onValidate(item.id)}
                      >
                        {validatingId === item.id ? 'Validation…' : 'Valider'}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => onReject(item)}>
                        Rejeter
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * ValidationQueue.tsx — La file de validation de l'ingestion.
 * Table alignée sur le style de /editor/documents (sticky header, colonnes mono
 * uppercase) avec sélection multiple et actions contextuelles par étape :
 *  - draft  : Parser MD/JSON, Relancer l'extraction (échec), Rejeter ;
 *  - review : Contrôler (drawer), Publier, Rejeter.
 */
import { useState } from 'react';
import type { PythonDocumentSummary } from '../api/pythonApi';
import type { QueueStage } from './IngestionStats';
import { RoleBadge, ScopeBadge, Spinner, StatusBadge } from './badges';

const TH_CLS =
  'text-left px-4 py-3 text-t3 font-mono text-[10px] uppercase tracking-widest font-semibold border-b border-b1 whitespace-nowrap';

/**
 * Mini-pipeline en langage clair : Source (PDF) → Texte extrait → Structuré.
 * Le détail technique des artefacts (Markdown / JSON) est en infobulle.
 */
function PipelineCell({ doc }: { doc: PythonDocumentSummary }) {
  const isRunning = doc.latest_run_status === 'running' || doc.extraction_status === 'processing';
  const hasText = Boolean(doc.has_md || doc.has_json);
  const artefacts = [doc.has_md && 'Markdown', doc.has_json && 'JSON'].filter(Boolean).join(' + ') || 'aucun';
  return (
    <div
      className="flex items-center gap-1.5 text-[10px] font-mono whitespace-nowrap"
      title={`Source PDF → texte extrait (${artefacts}) → structuration en articles`}
    >
      <span className="text-t2">Source</span>
      <span className="text-t4">→</span>
      <span className={hasText ? 'text-green' : 'text-t4'}>Texte{hasText ? ' ✓' : ''}</span>
      <span className="text-t4">→</span>
      {isRunning ? (
        <span className="inline-flex items-center gap-1 text-amber">
          <Spinner className="w-3 h-3" /> en cours
        </span>
      ) : (doc.nb_articles ?? 0) > 0 ? (
        <span className="text-gold">{doc.nb_articles} article{(doc.nb_articles ?? 0) > 1 ? 's' : ''}</span>
      ) : (
        <span className="text-t4">0 article</span>
      )}
    </div>
  );
}

function RowActions({
  doc,
  stage,
  busy,
  onParse,
  onReprocess,
  onPublish,
  onReject,
}: {
  doc: PythonDocumentSummary;
  stage: QueueStage;
  busy: boolean;
  onParse: (id: string, fmt: 'md' | 'json') => void;
  onReprocess: (id: string) => void;
  onPublish: (ids: string[]) => void;
  onReject: (ids: string[]) => void;
}) {
  const [confirmReject, setConfirmReject] = useState(false);
  const btn = 'h-6 px-2 text-[11px] font-mono rounded border transition-colors disabled:opacity-40';

  if (confirmReject) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          disabled={busy}
          onClick={() => { onReject([doc.id]); setConfirmReject(false); }}
          className={`${btn} text-red bg-red/10 border-red/20 hover:bg-red/20`}
        >
          Confirmer le rejet
        </button>
        <button onClick={() => setConfirmReject(false)} className={`${btn} text-t2 bg-s3 border-b1 hover:bg-s4`}>
          Annuler
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {stage === 'review' && (
        <button
          disabled={busy || (doc.nb_articles ?? 0) === 0}
          onClick={() => onPublish([doc.id])}
          className={`${btn} text-green bg-green/10 border-green/20 hover:bg-green/20`}
          title={(doc.nb_articles ?? 0) === 0 ? 'Aucun article parsé — publication impossible' : 'Publier au catalogue'}
        >
          Publier
        </button>
      )}
      {stage === 'draft' && doc.has_md && (
        <button
          disabled={busy}
          onClick={() => onParse(doc.id, 'md')}
          className={`${btn} text-green bg-green/10 border-green/20 hover:bg-green/20`}
          title="Parser la structure depuis le Markdown"
        >
          Parser MD
        </button>
      )}
      {stage === 'draft' && doc.has_json && (
        <button
          disabled={busy}
          onClick={() => onParse(doc.id, 'json')}
          className={`${btn} text-blue bg-blue/10 border-blue/20 hover:bg-blue/20`}
          title="Parser la structure depuis le JSON"
        >
          Parser JSON
        </button>
      )}
      {stage === 'draft' && doc.extraction_status === 'failed' && (
        <button
          disabled={busy}
          onClick={() => onReprocess(doc.id)}
          className={`${btn} text-amber bg-amber/10 border-amber/20 hover:bg-amber/20`}
          title="Relancer l'extraction MinerU depuis le PDF source"
        >
          Relancer
        </button>
      )}
      <button
        disabled={busy}
        onClick={() => setConfirmReject(true)}
        className={`${btn} text-t3 bg-s2 border-b1 hover:text-red hover:bg-red/10 hover:border-red/20`}
        title="Rejeter (corbeille)"
      >
        Rejeter
      </button>
    </div>
  );
}

export function ValidationQueue({
  docs,
  isLoading,
  stage,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  selectedRowId,
  onOpenDetail,
  busy,
  onParse,
  onReprocess,
  onPublish,
  onReject,
}: {
  docs: PythonDocumentSummary[] | undefined;
  isLoading: boolean;
  stage: QueueStage;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  selectedRowId: string | null;
  onOpenDetail: (doc: PythonDocumentSummary) => void;
  busy: boolean;
  onParse: (id: string, fmt: 'md' | 'json') => void;
  onReprocess: (id: string) => void;
  onPublish: (ids: string[]) => void;
  onReject: (ids: string[]) => void;
}) {
  const list = docs || [];
  const allChecked = list.length > 0 && list.every((d) => selectedIds.has(d.id));

  return (
    <div className="bg-s1 border border-b1 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto max-h-[calc(100vh-380px)] min-h-[200px]">
        {/* Cartes (mobile / tablette) */}
        <div className="md:hidden divide-y divide-b1">
          {isLoading ? (
            <div className="px-4 py-12 text-center text-t3 text-xs font-mono">
              <span className="inline-flex items-center gap-2"><Spinner /> Chargement de la file…</span>
            </div>
          ) : list.length === 0 ? (
            <div className="px-4 py-12 text-center font-mono text-xs uppercase tracking-widest text-t3">
              {stage === 'review' ? 'Rien à valider — la file est vide ✓' : 'Rien à traiter — déposez un document'}
            </div>
          ) : (
            list.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenDetail(doc)}
                className={[
                  'p-3 cursor-pointer transition-colors',
                  selectedRowId === doc.id ? 'bg-gold/5' : selectedIds.has(doc.id) ? 'bg-s2/60' : 'hover:bg-s2/40',
                ].join(' ')}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(doc.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggleSelect(doc.id)}
                    className="mt-0.5 accent-gold cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-t1 text-xs font-body line-clamp-2">{doc.titre_officiel}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <RoleBadge role={doc.document_role} />
                      <ScopeBadge scope={doc.legal_scope} />
                      <StatusBadge status={doc.extraction_status} />
                    </div>
                    <div className="mt-2"><PipelineCell doc={doc} /></div>
                    <div className="mt-2.5">
                      <RowActions
                        doc={doc}
                        stage={stage}
                        busy={busy}
                        onParse={onParse}
                        onReprocess={onReprocess}
                        onPublish={onPublish}
                        onReject={onReject}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <table className="hidden md:table w-full text-sm border-separate border-spacing-0">
          <thead className="bg-s2/60 sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className={`${TH_CLS} w-10`}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={onToggleSelectAll}
                  className="accent-gold cursor-pointer"
                  title="Tout sélectionner"
                />
              </th>
              <th className={TH_CLS}>Document</th>
              <th className={TH_CLS}>Pipeline</th>
              <th className={TH_CLS}>Extraction</th>
              <th className={TH_CLS}>Déposé le</th>
              <th className={`${TH_CLS} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-t3 text-xs font-mono">
                  <span className="inline-flex items-center gap-2"><Spinner /> Chargement de la file…</span>
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <span className="font-mono text-xs uppercase tracking-widest text-t3">
                    {stage === 'review'
                      ? 'Rien à valider — la file est vide ✓'
                      : 'Rien à traiter — déposez un document'}
                  </span>
                </td>
              </tr>
            ) : (
              list.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => onOpenDetail(doc)}
                  className={[
                    'cursor-pointer transition-colors',
                    selectedRowId === doc.id ? 'bg-gold/5' : selectedIds.has(doc.id) ? 'bg-s2/60' : 'hover:bg-s2/40',
                  ].join(' ')}
                >
                  <td className="px-4 py-3 border-b border-b1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => onToggleSelect(doc.id)}
                      className="accent-gold cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 border-b border-b1 max-w-[360px]">
                    <div className="text-t1 text-xs font-body truncate">{doc.titre_officiel}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <RoleBadge role={doc.document_role} />
                      <ScopeBadge scope={doc.legal_scope} />
                      {doc.official_journal_id && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-purple bg-purple/10 border border-purple/25">
                          issu d'un JO
                        </span>
                      )}
                      {doc.stock_code && (
                        <span className="text-t4 text-[10px] font-mono truncate max-w-[140px]">{doc.stock_code}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-b1">
                    <PipelineCell doc={doc} />
                  </td>
                  <td className="px-4 py-3 border-b border-b1">
                    <StatusBadge status={doc.extraction_status} />
                  </td>
                  <td className="px-4 py-3 border-b border-b1 text-t3 text-[11px] font-mono whitespace-nowrap">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 border-b border-b1 text-right">
                    <RowActions
                      doc={doc}
                      stage={stage}
                      busy={busy}
                      onParse={onParse}
                      onReprocess={onReprocess}
                      onPublish={onPublish}
                      onReject={onReject}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

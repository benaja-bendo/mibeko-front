/**
 * DocumentDetailPanel.tsx — Panneau latéral de détail d'un document ingéré :
 * métadonnées, fichiers stockés (MinIO), historique des runs d'extraction,
 * aperçu des articles parsés.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getPythonDocument,
  getPythonDocumentArticles,
  type PythonExtractionRun,
} from '../api/pythonApi';
import { RoleBadge, ScopeBadge, Spinner, StatusBadge } from './badges';

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatSize(bytes?: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

const FILE_CATEGORY_LABELS: Record<string, string> = {
  SOURCE_PDF: 'PDF source',
  EXTRACTION_MARKDOWN: 'Markdown',
  EXTRACTION_JSON: 'JSON',
};

function MetaItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <div className="text-t4 text-[10px] font-mono uppercase tracking-widest">{label}</div>
      <div className="text-t2 text-xs font-mono truncate mt-0.5">{value || '—'}</div>
    </div>
  );
}

function RunItem({ run }: { run: PythonExtractionRun }) {
  const error = typeof run.meta?.error === 'string' ? (run.meta.error as string) : null;
  return (
    <div className="px-3 py-2 bg-s2 border border-b1 rounded-md space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-t2 text-[11px] font-mono">{run.source || 'RUN'}</span>
        <StatusBadge status={run.status} />
      </div>
      <div className="text-t4 text-[10px] font-mono">
        {formatDateTime(run.started_at)}
        {run.finished_at ? ` → ${formatDateTime(run.finished_at)}` : ''}
      </div>
      {error && (
        <div className="text-red text-[10px] font-mono bg-red/8 border border-red/15 rounded px-2 py-1 break-words">
          {error.slice(0, 300)}
        </div>
      )}
    </div>
  );
}

export function DocumentDetailPanel({
  docId,
  onClose,
  onParse,
  onPublish,
  onReject,
  busy = false,
}: {
  docId: string;
  onClose: () => void;
  onParse: (id: string, fmt: 'md' | 'json') => void;
  onPublish?: (ids: string[]) => void;
  onReject?: (ids: string[]) => void;
  busy?: boolean;
}) {
  const [tab, setTab] = useState<'overview' | 'articles'>('overview');
  const [confirmReject, setConfirmReject] = useState(false);

  const { data: doc, isLoading } = useQuery({
    queryKey: ['python-document', docId],
    queryFn: () => getPythonDocument(docId),
    refetchInterval: 8000,
  });

  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ['python-document-articles', docId],
    queryFn: () => getPythonDocumentArticles(docId, 1, 15),
    enabled: tab === 'articles',
  });

  return (
    <aside className="bg-s1 border border-b1 rounded-xl overflow-hidden flex flex-col h-full shadow-2xl">
      {/* En-tête */}
      <div className="flex items-start gap-3 px-4 py-3 border-b border-b1">
        <div className="flex-1 min-w-0">
          {isLoading || !doc ? (
            <div className="flex items-center gap-2 text-t3 text-xs font-mono py-1">
              <Spinner className="w-3.5 h-3.5" /> Chargement du détail…
            </div>
          ) : (
            <>
              <div className="text-t1 text-sm font-body font-semibold leading-snug">{doc.titre_officiel}</div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <RoleBadge role={doc.document_role} />
                <ScopeBadge scope={doc.legal_scope} />
                <StatusBadge status={doc.extraction_status} />
                {doc.curation_status && (
                  <span className="text-t4 text-[10px] font-mono">curation : {doc.curation_status}</span>
                )}
              </div>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-t3 hover:text-t1 transition-colors shrink-0 h-6 w-6 flex items-center justify-center rounded hover:bg-s3"
          title="Fermer le détail"
        >
          ✕
        </button>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-b1">
        {([
          ['overview', 'Vue d’ensemble'],
          ['articles', `Articles${doc ? ` (${doc.nb_articles})` : ''}`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'px-4 h-9 text-xs font-mono transition-colors border-b-2 -mb-px',
              tab === key ? 'text-gold border-gold/60' : 'text-t3 border-transparent hover:text-t2',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto p-4 space-y-4 flex-1 min-h-0">
        {tab === 'overview' && doc && (
          <>
            {/* Contrôle approfondi dans le viewer (structure, PDF, édition) */}
            <Link
              to={`/editor/viewer/${doc.id}`}
              className="flex items-center justify-center gap-2 h-8 text-xs font-mono text-gold bg-gold-d border border-gold/25 rounded-md hover:bg-gold/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.5]">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Ouvrir dans le viewer
            </Link>

            {/* Actions parsing */}
            {(doc.has_md || doc.has_json) && (
              <div className="flex items-center gap-2">
                {doc.has_md && (
                  <button
                    onClick={() => onParse(doc.id, 'md')}
                    className="flex-1 h-8 text-xs font-mono text-green bg-green/10 border border-green/20 rounded-md hover:bg-green/20 transition-colors"
                  >
                    Parser depuis MD
                  </button>
                )}
                {doc.has_json && (
                  <button
                    onClick={() => onParse(doc.id, 'json')}
                    className="flex-1 h-8 text-xs font-mono text-blue bg-blue/10 border border-blue/20 rounded-md hover:bg-blue/20 transition-colors"
                  >
                    Parser depuis JSON
                  </button>
                )}
              </div>
            )}

            {/* Métadonnées */}
            <div className="grid grid-cols-2 gap-3">
              <MetaItem label="Clé document" value={doc.document_key} />
              <MetaItem label="Code stock" value={doc.stock_code} />
              <MetaItem label="Type" value={doc.type_code} />
              <MetaItem label="Statut juridique" value={doc.statut} />
              <MetaItem label="Publication" value={doc.date_publication} />
              <MetaItem label="Signature" value={doc.date_signature} />
              <MetaItem label="Consolidé au" value={doc.consolidation_as_of} />
              <MetaItem label="Nœuds de structure" value={String(doc.nb_nodes)} />
            </div>

            {/* Fichiers */}
            <div>
              <div className="text-t3 text-[10px] font-mono uppercase tracking-widest mb-1.5">
                Fichiers ({doc.files.length})
              </div>
              <div className="space-y-1.5">
                {doc.files.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-2 bg-s2 border border-b1 rounded-md">
                    <span className="text-t2 text-[11px] font-mono shrink-0">
                      {FILE_CATEGORY_LABELS[f.file_category || ''] || f.file_category || 'Fichier'}
                    </span>
                    <span className="text-t4 text-[11px] font-mono truncate flex-1">{f.original_filename}</span>
                    <span className="text-t3 text-[10px] font-mono shrink-0">{formatSize(f.file_size)}</span>
                  </div>
                ))}
                {doc.files.length === 0 && (
                  <div className="text-t4 text-[11px] font-mono">Aucun fichier.</div>
                )}
              </div>
            </div>

            {/* Runs */}
            <div>
              <div className="text-t3 text-[10px] font-mono uppercase tracking-widest mb-1.5">
                Runs d'extraction ({doc.extraction_runs.length})
              </div>
              <div className="space-y-1.5">
                {[...doc.extraction_runs]
                  .sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''))
                  .slice(0, 6)
                  .map((r) => <RunItem key={r.id} run={r} />)}
                {doc.extraction_runs.length === 0 && (
                  <div className="text-t4 text-[11px] font-mono">Aucun run.</div>
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'articles' && (
          articlesLoading ? (
            <div className="flex items-center justify-center gap-2 text-t3 text-xs font-mono py-8">
              <Spinner /> Chargement des articles…
            </div>
          ) : !articles || articles.items.length === 0 ? (
            <div className="text-t3 text-xs font-mono text-center py-8">
              Aucun article parsé. Lancez un parsing depuis le MD ou le JSON.
            </div>
          ) : (
            <div className="space-y-2">
              {articles.items.map((a) => (
                <div key={a.id} className="px-3 py-2 bg-s2 border border-b1 rounded-md">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gold text-[11px] font-mono font-semibold">
                      Article {a.numero_article}
                    </span>
                    <span className="text-t4 text-[10px] font-mono">{a.validation_status}</span>
                  </div>
                  {a.versions[0]?.contenu_texte && (
                    <p className="text-t2 text-[11px] font-body mt-1 line-clamp-3 whitespace-pre-line">
                      {a.versions[0].contenu_texte.slice(0, 280)}
                    </p>
                  )}
                </div>
              ))}
              {articles.total > articles.items.length && (
                <div className="text-t4 text-[10px] font-mono text-center pt-1">
                  {articles.items.length} affichés sur {articles.total}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Décision de curation */}
      {(onPublish || onReject) && doc && doc.curation_status !== 'published' && (
        <div className="px-4 py-3 border-t border-b1 flex items-center gap-2 bg-s2/40">
          {confirmReject ? (
            <>
              <button
                disabled={busy}
                onClick={() => { onReject?.([doc.id]); setConfirmReject(false); }}
                className="flex-1 h-8 text-xs font-mono text-red bg-red/10 border border-red/20 rounded-md hover:bg-red/20 transition-colors disabled:opacity-40"
              >
                Confirmer le rejet (corbeille)
              </button>
              <button
                onClick={() => setConfirmReject(false)}
                className="h-8 px-3 text-xs font-mono text-t2 bg-s3 border border-b1 rounded-md hover:bg-s4"
              >
                Annuler
              </button>
            </>
          ) : (
            <>
              {onPublish && (
                <button
                  disabled={busy || doc.nb_articles === 0}
                  onClick={() => onPublish([doc.id])}
                  className="flex-1 h-8 text-xs font-mono font-semibold text-[#120e00] bg-green rounded-md hover:opacity-90 transition-opacity disabled:opacity-40"
                  title={doc.nb_articles === 0 ? 'Aucun article parsé — publication impossible' : 'Publier au catalogue'}
                >
                  Publier au catalogue
                </button>
              )}
              {onReject && (
                <button
                  disabled={busy}
                  onClick={() => setConfirmReject(true)}
                  className="h-8 px-3 text-xs font-mono text-t3 bg-s2 border border-b1 rounded-md hover:text-red hover:bg-red/10 hover:border-red/20 transition-colors disabled:opacity-40"
                >
                  Rejeter
                </button>
              )}
            </>
          )}
        </div>
      )}
    </aside>
  );
}

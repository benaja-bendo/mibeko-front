/**
 * DocumentDetailPanel.tsx — Panneau latéral de détail d'un document ingéré :
 * métadonnées, fichiers stockés (MinIO), historique des runs d'extraction,
 * aperçu des articles parsés.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  discardRun,
  getPythonDocument,
  getPythonDocumentArticles,
  getRunDiff,
  promoteRun,
  type PythonExtractionRun,
} from '../api/pythonApi';
import { RoleBadge, ScopeBadge, Spinner, StatusBadge } from './badges';
import { formatDate } from '@/shared/lib/date';
import { displayArticleNumber } from '@/shared/lib/legalLabels';

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

function DiffStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`flex flex-col items-center px-2 py-1 rounded-md border ${tone}`}>
      <span className="text-sm font-mono font-semibold leading-none">{value}</span>
      <span className="text-[9px] font-mono uppercase tracking-wider mt-1 opacity-80">{label}</span>
    </div>
  );
}

/**
 * Carte d'arbitrage d'un retraitement non-destructif : un re-parsing d'un
 * document curé est parqué (staging) au lieu d'écraser le live. L'éditeur voit
 * un résumé de diff puis promeut (applique) ou rejette (le live reste intact).
 */
function StagedProposalCard({ docId, run }: { docId: string; run: PythonExtractionRun }) {
  const queryClient = useQueryClient();

  const { data: diff, isLoading } = useQuery({
    queryKey: ['run-diff', docId, run.id],
    queryFn: () => getRunDiff(docId, run.id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['python-document', docId] });
    queryClient.invalidateQueries({ queryKey: ['python-document-articles', docId] });
    queryClient.invalidateQueries({ queryKey: ['python-documents'] });
    queryClient.invalidateQueries({ queryKey: ['python-stats'] });
    queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
  };

  const promote = useMutation({ mutationFn: () => promoteRun(docId, run.id), onSuccess: invalidate });
  const discard = useMutation({ mutationFn: () => discardRun(docId, run.id), onSuccess: invalidate });
  const busy = promote.isPending || discard.isPending;
  const error = (promote.error || discard.error) as Error | null;

  return (
    <div className="rounded-lg border border-gold/30 bg-gold-d p-3 space-y-3">
      <div className="flex items-start gap-2">
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 stroke-gold fill-none stroke-[1.5] mt-0.5">
          <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
        <div className="min-w-0">
          <div className="text-gold text-xs font-body font-semibold">Retraitement en attente d'arbitrage</div>
          <p className="text-t3 text-[11px] font-mono mt-0.5 leading-relaxed">
            Un nouveau parsing est prêt. Le contenu publié n'a pas été modifié : compare puis promeus ou rejette.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-t3 text-[11px] font-mono">
          <Spinner className="w-3.5 h-3.5" /> Calcul du diff…
        </div>
      ) : diff ? (
        <div className="grid grid-cols-4 gap-1.5">
          <DiffStat label="Ajoutés" value={diff.summary.added} tone="text-green bg-green/10 border-green/20" />
          <DiffStat label="Modifiés" value={diff.summary.changed} tone="text-amber bg-amber/10 border-amber/20" />
          <DiffStat label="Supprimés" value={diff.summary.removed} tone="text-red bg-red/10 border-red/20" />
          <DiffStat label="Inchangés" value={diff.summary.unchanged} tone="text-t3 bg-s2 border-b1" />
        </div>
      ) : null}

      {error && (
        <div className="text-red text-[10px] font-mono bg-red/8 border border-red/15 rounded px-2 py-1 break-words">
          {error.message}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          disabled={busy}
          onClick={() => promote.mutate()}
          className="flex-1 h-8 text-xs font-mono font-semibold text-on-gold bg-green rounded-md hover:opacity-90 transition-opacity disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
          title="Remplacer le contenu par cette proposition"
        >
          {promote.isPending && <Spinner className="w-3.5 h-3.5" />} Promouvoir
        </button>
        <button
          disabled={busy}
          onClick={() => discard.mutate()}
          className="h-8 px-3 text-xs font-mono text-t3 bg-s2 border border-b1 rounded-md hover:text-red hover:bg-red/10 hover:border-red/20 transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
          title="Rejeter la proposition (le contenu existant reste intact)"
        >
          {discard.isPending && <Spinner className="w-3.5 h-3.5" />} Rejeter
        </button>
      </div>
    </div>
  );
}

export function DocumentDetailPanel({
  docId,
  onClose,
  onParse,
  onReprocess,
  onPublish,
  onReject,
  busy = false,
}: {
  docId: string;
  onClose: () => void;
  onParse: (id: string, fmt: 'md' | 'json') => void;
  onReprocess?: (id: string) => void;
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

  // Proposition de retraitement la plus récente parquée en staging (le cas
  // échéant) : elle est arbitrée par l'éditeur, le live n'ayant pas été touché.
  const stagedRun = doc?.extraction_runs
    ? [...doc.extraction_runs]
        .filter((r) => (r.meta as { staged?: boolean } | null)?.staged === true)
        .sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''))[0]
    : undefined;

  // Le re-OCR (réparation depuis le PDF source) n'est proposé que si ce PDF existe.
  const hasSourcePdf = doc?.files?.some((f) => f.file_category === 'SOURCE_PDF') ?? false;

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
            {/* Arbitrage d'un retraitement non-destructif en attente */}
            {stagedRun && <StagedProposalCard docId={doc.id} run={stagedRun} />}

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

            {/* Réparer : re-traitement non-destructif. Sur un document curé ou
                publié, la proposition est mise en attente d'arbitrage (carte
                ci-dessus, diff → promouvoir / rejeter) au lieu d'écraser le live. */}
            {(hasSourcePdf || doc.has_md || doc.has_json) && (
              <div className="rounded-lg border border-b1 bg-s2/40 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-t2 fill-none stroke-[1.5]">
                    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5 2.5-2.5z" />
                  </svg>
                  <div className="text-t2 text-xs font-body font-semibold">Réparer</div>
                </div>
                <p className="text-t4 text-[11px] font-mono leading-relaxed">
                  Re-traitement non-destructif : sur un document publié ou validé, la
                  nouvelle version est mise en attente d'arbitrage — le contenu en
                  place n'est pas modifié tant qu'il n'est pas promu.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {hasSourcePdf && onReprocess && (
                    <button
                      disabled={busy}
                      onClick={() => onReprocess(doc.id)}
                      className="flex-1 min-w-[140px] h-8 text-xs font-mono text-amber bg-amber/10 border border-amber/20 rounded-md hover:bg-amber/20 transition-colors disabled:opacity-40"
                      title="Relancer l'extraction OCR (MinerU) depuis le PDF source — pour récupérer du texte ou des pages perdus à l'extraction"
                    >
                      Ré-extraire (OCR)
                    </button>
                  )}
                  {doc.has_md && (
                    <button
                      disabled={busy}
                      onClick={() => onParse(doc.id, 'md')}
                      className="flex-1 min-w-[120px] h-8 text-xs font-mono text-green bg-green/10 border border-green/20 rounded-md hover:bg-green/20 transition-colors disabled:opacity-40"
                      title="Re-parser la structure depuis le Markdown"
                    >
                      Re-parser MD
                    </button>
                  )}
                  {doc.has_json && (
                    <button
                      disabled={busy}
                      onClick={() => onParse(doc.id, 'json')}
                      className="flex-1 min-w-[120px] h-8 text-xs font-mono text-blue bg-blue/10 border border-blue/20 rounded-md hover:bg-blue/20 transition-colors disabled:opacity-40"
                      title="Re-parser la structure depuis le JSON"
                    >
                      Re-parser JSON
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Métadonnées */}
            <div className="grid grid-cols-2 gap-3">
              <MetaItem label="Clé document" value={doc.document_key} />
              <MetaItem label="Code stock" value={doc.stock_code} />
              <MetaItem label="Type" value={doc.type_code} />
              <MetaItem
                label="Statut juridique"
                value={
                  doc.statut === 'vigueur' && doc.statut_verifie === false
                    ? 'vigueur (non vérifié)'
                    : doc.statut
                }
              />
              <MetaItem label="Publication" value={formatDate(doc.date_publication)} />
              <MetaItem label="Signature" value={formatDate(doc.date_signature)} />
              <MetaItem label="Consolidé au" value={formatDate(doc.consolidation_as_of)} />
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
                      Article {displayArticleNumber(a.numero_article)}
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
                  className="flex-1 h-8 text-xs font-mono font-semibold text-on-gold bg-green rounded-md hover:opacity-90 transition-opacity disabled:opacity-40"
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

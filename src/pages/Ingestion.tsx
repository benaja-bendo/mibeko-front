/**
 * Ingestion.tsx — File de pilotage de l'ingestion documentaire (admin/éditeur).
 *
 * La page n'affiche QUE les documents en transition (sas de validation) :
 *  - « À valider » (review) : parsing terminé, en attente d'une décision —
 *    Publier (catalogue + app pro) ou Rejeter (corbeille) ;
 *  - « À traiter » (draft) : déposés, extraction/parsing à piloter.
 * Le corpus publié vit dans /editor/documents.
 *
 * Publication/rejet passent par l'API Laravel (bulk curation), le reste par
 * l'API Python (upload, parsing, runs). Suivi temps réel via SSE.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPythonDocuments,
  parseDocument,
  reprocessDocument,
  type PythonDocumentSummary,
} from '@/features/ingestion/api/pythonApi';
import { bulkUpdateDocuments, bulkDeleteDocuments } from '@/features/documents/api/laravelApi';
import { usePythonStream } from '@/features/ingestion/hooks/usePythonStream';
import { IngestionStats, ServiceHealth, type QueueStage } from '@/features/ingestion/components/IngestionStats';
import { ValidationQueue } from '@/features/ingestion/components/ValidationQueue';
import { UploadSlideOver } from '@/features/ingestion/components/UploadSlideOver';
import { DocumentDetailPanel } from '@/features/ingestion/components/DocumentDetailPanel';
import AppLayout from '@/shared/components/layout/AppLayout';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toast } from '@/shared/store/useToast';
import { documentRoleLabel } from '@/shared/lib/labels';

export default function Ingestion() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<QueueStage>('review');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STOCK' | 'FLUX'>('ALL');
  const [failedOnly, setFailedOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  usePythonStream({
    onNotification: ({ message, type }) => toast[type](message),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['python-documents'] });
    queryClient.invalidateQueries({ queryKey: ['python-stats'] });
    // Le catalogue /editor/documents doit refléter les publications/rejets.
    queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
  };

  // ── File : seulement l'étape active du sas ────────────────────────────────
  const { data: docs, isLoading } = useQuery({
    queryKey: ['python-documents', stage],
    queryFn: () => getPythonDocuments({ limit: 100, curation: stage }),
    refetchInterval: 10000,
  });

  const filteredDocs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (docs || []).filter((d) => {
      if (roleFilter !== 'ALL' && d.document_role !== roleFilter) return false;
      if (failedOnly && d.extraction_status !== 'failed') return false;
      if (needle) {
        const haystack = `${d.titre_officiel} ${d.stock_code || ''} ${d.type_code || ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [docs, search, roleFilter, failedOnly]);

  // ── Décisions de curation (API Laravel) ──────────────────────────────────
  const publishMutation = useMutation({
    mutationFn: (ids: string[]) =>
      bulkUpdateDocuments({ ids, action: 'set_curation_status', value: 'published' }),
    onSuccess: (res, ids) => {
      toast.success(res.message || `${ids.length} document(s) publié(s)`);
      setSelectedIds(new Set());
      if (detailId && ids.includes(detailId)) setDetailId(null);
      invalidateAll();
    },
    onError: (err) => toast.fromError(err, 'Erreur de publication'),
  });

  const rejectMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteDocuments({ ids }),
    onSuccess: (_res, ids) => {
      toast.success(`${ids.length} document(s) rejeté(s) (corbeille)`);
      setSelectedIds(new Set());
      if (detailId && ids.includes(detailId)) setDetailId(null);
      invalidateAll();
    },
    onError: (err) => toast.fromError(err, 'Erreur de rejet'),
  });

  const busy = publishMutation.isPending || rejectMutation.isPending;

  // ── Pilotage du pipeline (API Python) ─────────────────────────────────────
  const handleParse = async (id: string, fmt: 'md' | 'json') => {
    try {
      await parseDocument(id, fmt);
      toast.info(`Parsing ${fmt.toUpperCase()} lancé en arrière-plan`);
      invalidateAll();
    } catch (err: unknown) {
      toast.fromError(err, 'Erreur de parsing');
    }
  };

  const handleReprocess = async (id: string) => {
    try {
      await reprocessDocument(id);
      toast.info("Relance de l'extraction en arrière-plan");
      invalidateAll();
    } catch (err: unknown) {
      toast.fromError(err, 'Erreur de relance');
    }
  };

  // ── Sélection ─────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelectedIds((prev) =>
      prev.size === filteredDocs.length ? new Set() : new Set(filteredDocs.map((d) => d.id))
    );

  const changeStage = (next: QueueStage) => {
    setStage(next);
    setFailedOnly(false);
    setSelectedIds(new Set());
    setDetailId(null);
  };

  // Carte « Échecs » : bascule sur l'étape « à traiter » filtrée aux échecs réels.
  const selectFailed = () => {
    setStage('draft');
    setFailedOnly(true);
    setSelectedIds(new Set());
    setDetailId(null);
  };

  if (!user || (!user.roles?.includes('admin') && !user.roles?.includes('editor'))) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4 px-4">
            <h1 className="text-2xl font-bold text-red">Accès refusé</h1>
            <p className="text-t2 text-sm">
              Vous n'avez pas les droits nécessaires pour accéder à cette page.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        {/* Conteneur standard (aligné sur PageContainer) pour éviter tout décalage entre pages */}
        <div className="max-w-screen-2xl mx-auto w-full px-4 md:px-6 py-6 space-y-4">
          {/* ── En-tête ──────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.5]">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-display font-semibold text-t1">Ingestion documentaire</h1>
                <p className="text-t3 text-[11px] font-mono mt-0.5 flex items-center gap-2">
                  File de validation — rien n'est publié sans votre accord
                  <ServiceHealth />
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="self-start sm:self-auto inline-flex items-center gap-2 h-9 px-4 bg-gold text-on-gold rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-gold/10 shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Déposer
            </button>
          </div>

          {/* ── KPIs / étapes du sas ─────────────────────────────────────── */}
          <IngestionStats
            activeStage={stage}
            failedActive={failedOnly}
            onSelectStage={changeStage}
            onSelectFailed={selectFailed}
          />

          {/* ── Onglets + recherche + filtre rôle ────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-xl border border-b1 overflow-hidden">
              {(['review', 'draft'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => changeStage(s)}
                  className={[
                    'h-10 px-4 text-xs font-mono transition-colors',
                    stage === s ? 'bg-gold/10 text-gold' : 'bg-s1 text-t3 hover:text-t2',
                  ].join(' ')}
                >
                  {s === 'review' ? 'À valider' : 'À traiter'}
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[180px] group">
              <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 stroke-t3 group-focus-within:stroke-gold fill-none stroke-[1.5] transition-colors pointer-events-none">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Titre, code stock…"
                className="w-full h-10 bg-s1 border border-b1 rounded-xl text-t1 pl-10 pr-4 text-sm outline-none focus:border-gold/50 focus:ring-4 focus:ring-gold/5 placeholder:text-t4 transition-all"
              />
            </div>

            <div className="flex items-center rounded-xl border border-b1 overflow-hidden">
              {(['ALL', 'STOCK', 'FLUX'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={[
                    'h-10 px-3 text-[11px] font-mono transition-colors whitespace-nowrap',
                    roleFilter === r ? 'bg-gold/10 text-gold' : 'bg-s1 text-t3 hover:text-t2',
                  ].join(' ')}
                >
                  {r === 'ALL' ? 'Tous' : documentRoleLabel(r, { short: true })}
                </button>
              ))}
            </div>
          </div>

          {/* ── Filtre actif « échecs » (amovible) ───────────────────────── */}
          {failedOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFailedOnly(false)}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 bg-red/10 border border-red/20 text-red text-[11px] font-mono rounded-full hover:bg-red/20 transition-colors"
              >
                Échecs d'extraction uniquement
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-current fill-none stroke-[2.5]">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {/* ── Barre d'actions bulk ─────────────────────────────────────── */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gold/5 border border-gold/20 rounded-xl flex-wrap">
              <span className="text-gold text-xs font-mono font-semibold">
                {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </span>
              <div className="flex-1" />
              {stage === 'review' && (
                <button
                  disabled={busy}
                  onClick={() => publishMutation.mutate([...selectedIds])}
                  className="h-8 px-3 text-xs font-mono font-semibold text-on-gold bg-green rounded-md hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  Publier la sélection
                </button>
              )}
              <button
                disabled={busy}
                onClick={() => rejectMutation.mutate([...selectedIds])}
                className="h-8 px-3 text-xs font-mono text-red bg-red/10 border border-red/20 rounded-md hover:bg-red/20 transition-colors disabled:opacity-40"
              >
                Rejeter la sélection
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="h-8 px-3 text-xs font-mono text-t2 bg-s2 border border-b1 rounded-md hover:bg-s3"
              >
                Désélectionner
              </button>
            </div>
          )}

          {/* ── File ─────────────────────────────────────────────────────── */}
          <ValidationQueue
            docs={filteredDocs}
            isLoading={isLoading}
            stage={stage}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            selectedRowId={detailId}
            onOpenDetail={(d: PythonDocumentSummary) => setDetailId(d.id === detailId ? null : d.id)}
            busy={busy}
            onParse={handleParse}
            onReprocess={handleReprocess}
            onPublish={(ids) => publishMutation.mutate(ids)}
            onReject={(ids) => rejectMutation.mutate(ids)}
          />
        </div>
      </div>

      {/* ── Drawer de contrôle ─────────────────────────────────────────── */}
      {detailId && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetailId(null)} />
          <div className="relative w-full sm:max-w-[480px] h-full p-3 animate-in slide-in-from-right-4">
            <DocumentDetailPanel
              docId={detailId}
              onClose={() => setDetailId(null)}
              onParse={handleParse}
              onReprocess={handleReprocess}
              onPublish={(ids) => publishMutation.mutate(ids)}
              onReject={(ids) => rejectMutation.mutate(ids)}
              busy={busy}
            />
          </div>
        </div>
      )}

      {/* ── Slide-over de dépôt ────────────────────────────────────────── */}
      <UploadSlideOver
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={(msg) => {
          toast.success(msg);
          invalidateAll();
        }}
      />
    </AppLayout>
  );
}

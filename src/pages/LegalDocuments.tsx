/**
 * LegalDocuments.tsx — Gestion pro des documents juridiques.
 * A. Filtres avancés  B. Indicateurs de complétude
 * C. Audit            D. Actions en masse
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { formatCompactNumber } from '@/shared/lib/formatNumber';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
} from '@tanstack/react-table';
import {
  getCatalog,
  bulkUpdateDocuments,
  bulkDeleteDocuments,
  getInstitutions,
  getDocumentTypes,
  deleteLegalDocument,
  triggerDocumentEmbedding,
  cancelDocumentEmbedding,
  type LaravelDocument,
  type CatalogFilters,
} from '@/features/documents/api/laravelApi';
import AppLayout from '@/widgets/layout/AppLayout';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toast } from '@/shared/store/useToast';
import DeletionImpactPanel from '@/features/documents/components/DeletionImpactPanel';
import { SEARCH_AI_LABEL } from '@/shared/lib/labels';
import { documentLineLabel } from '@/shared/lib/legalLabels';
import { hasRole } from '@/shared/types/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';

// ─── Constants ───────────────────────────────────────────────────────────────

const CURATION_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  review: 'À valider',
  validated: 'Validé',
  published: 'Publié',
};

const CURATION_CFG: Record<string, string> = {
  published: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  validated: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  review: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  draft: 'text-t3 bg-s2 border-b1',
};

const STATUT_LABELS: Record<string, string> = {
  vigueur: 'En vigueur',
  abroge: 'Abrogé',
  projet: 'Projet',
};

const STATUT_CFG: Record<string, string> = {
  vigueur: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  abroge: 'text-red-400 bg-red-400/10 border-red-400/20',
  projet: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Intitulé de la ligne : titre officiel, suivi de l'objet dérivé du corps
 * quand le JO a publié l'acte en abrégé (« Décret n° 2025-240 du 20 juin
 * 2025. » et rien d'autre). Les deux, jamais l'un à la place de l'autre.
 */
function docTitle(doc: LaravelDocument): string {
  const titre = doc.titre_officiel || doc.title || '';

  return titre ? documentLineLabel(titre, doc.libelle_descriptif) : '';
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} j`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem`;
  return formatDate(iso);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Badge({ label, cfg }: { label: string; cfg: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border ${cfg}`}>
      {label}
    </span>
  );
}

function CompletenessIndicators({ doc }: { doc: LaravelDocument }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Articles count */}
      {doc.articles_count !== undefined && (
        <span
          title={`${doc.articles_count} article(s)`}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
            doc.articles_count > 0 ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' : 'text-t4 bg-s2 border-b1'
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-current fill-none stroke-2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          </svg>
          {doc.articles_count}
        </span>
      )}
      {/* Relations */}
      {(doc.relations_count ?? 0) > 0 && (
        <span title="A des relations" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-purple-400 bg-purple-400/10 border border-purple-400/20">
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-current fill-none stroke-2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </span>
      )}
      {/* Tags */}
      {(doc.tags_count ?? 0) > 0 && (
        <span title={`${doc.tags_count} tag(s)`} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-t3 bg-s2 border border-b1">
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-current fill-none stroke-2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        </span>
      )}
      {/* Warning: STOCK sans stock_code */}
      {doc.missing_stock_code && (
        <span title="Code STOCK manquant" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20">
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-current fill-none stroke-2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
      )}
    </div>
  );
}

// ─── Embedding status cell ────────────────────────────────────────────────────

interface EmbeddingStatusCellProps {
  doc: LaravelDocument;
  isInProgress: boolean;
  onEmbed: (doc: LaravelDocument) => void;
  onCancel: (id: string) => void;
  isTriggering: boolean;
  isCancelling: boolean;
}

function EmbeddingStatusCell({ doc, isInProgress, onEmbed, onCancel, isTriggering, isCancelling }: EmbeddingStatusCellProps) {
  const total = doc.articles_count ?? 0;
  const embedded = doc.embedded_articles_count ?? 0;

  if (total === 0) {
    return <span className="text-t4 text-[10px] font-mono">—</span>;
  }

  const pct = Math.min(100, Math.round((embedded / total) * 100));

  // En cours : barre animée + arrêt possible
  if (isInProgress) {
    return (
      <div className="flex items-center gap-2 min-w-[110px]">
        <div className="flex-1 h-1 bg-s2 rounded-full overflow-hidden">
          <div className="h-full bg-violet-400 rounded-full animate-pulse transition-all" style={{ width: `${Math.max(pct, 6)}%` }} />
        </div>
        <span className="text-violet-400 text-[10px] font-mono shrink-0 tabular-nums">{embedded}/{total}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onCancel(doc.id); }}
          disabled={isCancelling}
          title="Interrompre l'indexation (le travail déjà fait est conservé)"
          className="h-5 px-1.5 text-[9px] font-mono bg-red-500/10 border border-red-500/20 text-red-400 rounded hover:bg-red-500/20 disabled:opacity-50 transition-all shrink-0"
        >
          Stop
        </button>
      </div>
    );
  }

  // Terminé
  if (embedded >= total) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-mono" title="Tous les articles sont indexés">
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-current fill-none stroke-[2.5]">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {total}/{total}
      </span>
    );
  }

  // Partiel / absent : bouton d'indexation
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`text-[10px] font-mono tabular-nums shrink-0 ${embedded === 0 ? 'text-t4' : 'text-amber-400'}`}
        title={`${embedded} article(s) indexé(s) sur ${total}`}
      >
        {embedded}/{total}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onEmbed(doc); }}
        disabled={isTriggering}
        title="Rendre ces articles consultables par l'IA et la recherche intelligente"
        className="h-5 px-1.5 text-[9px] font-mono bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded hover:bg-violet-500/20 disabled:opacity-50 transition-all whitespace-nowrap"
      >
        ↳ Indexer
      </button>
    </div>
  );
}

// ─── Filter panel ─────────────────────────────────────────────────────────────

interface ActiveFilters {
  statut: string;
  curation_status: string;
  institution_id: string;
  type_code: string;
  recent: string;
}

const EMPTY_FILTERS: ActiveFilters = {
  statut: '',
  curation_status: '',
  institution_id: '',
  type_code: '',
  recent: '',
};

interface FilterPanelProps {
  filters: ActiveFilters;
  onChange: (f: ActiveFilters) => void;
  onClose: () => void;
  institutions: { id: string; nom: string; sigle: string }[];
  types: { code: string; nom: string }[];
}

function FilterPanel({ filters, onChange, onClose, institutions, types }: FilterPanelProps) {
  const set = (key: keyof ActiveFilters, val: string) => onChange({ ...filters, [key]: val });
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="bg-s1 border border-b1 rounded-xl p-4 space-y-4 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-t2 text-xs font-semibold uppercase tracking-widest font-mono">
          Filtres {activeCount > 0 && <span className="ml-1 text-gold">({activeCount} actifs)</span>}
        </span>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button onClick={() => onChange(EMPTY_FILTERS)} className="text-[10px] text-t3 hover:text-red-400 font-mono transition-colors">
              Réinitialiser
            </button>
          )}
          <button onClick={onClose} className="text-t3 hover:text-t1 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Statut de validité */}
        <div className="space-y-1">
          <label className="text-t3 text-[10px] font-mono uppercase tracking-widest">Validité</label>
          <select
            value={filters.statut}
            onChange={(e) => set('statut', e.target.value)}
            className="w-full h-8 bg-s2 border border-b1 rounded-lg text-t1 text-xs px-2 focus:outline-none focus:border-gold/40 appearance-none"
          >
            <option value="">Tous</option>
            <option value="vigueur">En vigueur</option>
            <option value="abroge">Abrogé</option>
            <option value="projet">Projet</option>
          </select>
        </div>

        {/* Statut de curation */}
        <div className="space-y-1">
          <label className="text-t3 text-[10px] font-mono uppercase tracking-widest">Curation</label>
          <select
            value={filters.curation_status}
            onChange={(e) => set('curation_status', e.target.value)}
            className="w-full h-8 bg-s2 border border-b1 rounded-lg text-t1 text-xs px-2 focus:outline-none focus:border-gold/40 appearance-none"
          >
            <option value="">Tous</option>
            <option value="draft">Brouillon</option>
            <option value="review">À valider</option>
            <option value="validated">Validé</option>
            <option value="published">Publié</option>
          </select>
        </div>

        {/* Institution */}
        <div className="space-y-1">
          <label className="text-t3 text-[10px] font-mono uppercase tracking-widest">Institution</label>
          <select
            value={filters.institution_id}
            onChange={(e) => set('institution_id', e.target.value)}
            className="w-full h-8 bg-s2 border border-b1 rounded-lg text-t1 text-xs px-2 focus:outline-none focus:border-gold/40 appearance-none"
          >
            <option value="">Toutes</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>{i.sigle || i.nom}</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div className="space-y-1">
          <label className="text-t3 text-[10px] font-mono uppercase tracking-widest">Type</label>
          <select
            value={filters.type_code}
            onChange={(e) => set('type_code', e.target.value)}
            className="w-full h-8 bg-s2 border border-b1 rounded-lg text-t1 text-xs px-2 focus:outline-none focus:border-gold/40 appearance-none"
          >
            <option value="">Tous</option>
            {types.map((t) => (
              <option key={t.code} value={t.code}>{t.code}</option>
            ))}
          </select>
        </div>

        {/* Modifiés récemment */}
        <div className="space-y-1">
          <label className="text-t3 text-[10px] font-mono uppercase tracking-widest">Récents</label>
          <select
            value={filters.recent}
            onChange={(e) => set('recent', e.target.value)}
            className="w-full h-8 bg-s2 border border-b1 rounded-lg text-t1 text-xs px-2 focus:outline-none focus:border-gold/40 appearance-none"
          >
            <option value="">Tous</option>
            <option value="1">Aujourd'hui</option>
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk action bar ─────────────────────────────────────────────────────────

interface BulkBarProps {
  count: number;
  onDeselect: () => void;
  onAction: (action: 'set_curation_status' | 'set_statut', value: string) => void;
  onDelete: () => void;
  isLoading: boolean;
}

function BulkBar({ count, onDeselect, onAction, onDelete, isLoading }: BulkBarProps) {
  return (
    <div className="flex items-center gap-3 bg-gold/10 border border-gold/20 rounded-xl px-4 py-3 flex-wrap">
      <span className="text-gold text-sm font-semibold font-mono shrink-0">
        {count} sélectionné{count > 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onAction('set_curation_status', 'published')}
          disabled={isLoading}
          className="h-7 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono rounded-lg hover:bg-emerald-500/20 disabled:opacity-40 transition-all"
        >
          ✓ Publier
        </button>
        <button
          onClick={() => onAction('set_curation_status', 'review')}
          disabled={isLoading}
          className="h-7 px-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-mono rounded-lg hover:bg-amber-500/20 disabled:opacity-40 transition-all"
        >
          ↑ Soumettre à validation
        </button>
        <button
          onClick={() => onAction('set_statut', 'abroge')}
          disabled={isLoading}
          className="h-7 px-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono rounded-lg hover:bg-red-500/20 disabled:opacity-40 transition-all"
        >
          ✕ Abroger
        </button>
        <button
          onClick={() => onAction('set_curation_status', 'draft')}
          disabled={isLoading}
          className="h-7 px-3 bg-s2 border border-b1 text-t3 text-[11px] font-mono rounded-lg hover:text-t1 disabled:opacity-40 transition-all"
        >
          Repasser en brouillon
        </button>
        <button
          onClick={onDelete}
          disabled={isLoading}
          className="h-7 px-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono rounded-lg hover:bg-red-500/20 disabled:opacity-40 transition-all ml-2"
        >
          Supprimer
        </button>
      </div>
      <button onClick={onDeselect} className="ml-auto text-t3 hover:text-t1 text-[11px] font-mono transition-colors shrink-0">
        Désélectionner
      </button>
    </div>
  );
}

// ─── Active filter chips ──────────────────────────────────────────────────────

const FILTER_CHIP_LABELS: Record<string, Record<string, string>> = {
  statut: STATUT_LABELS,
  curation_status: CURATION_LABELS,
  recent: { '1': 'Aujourd\'hui', '7': '7 derniers jours', '30': '30 derniers jours' },
};

function FilterChips({ filters, onChange, institutions }: {
  filters: ActiveFilters;
  onChange: (f: ActiveFilters) => void;
  institutions: { id: string; nom: string; sigle: string }[];
}) {
  const chips: { key: keyof ActiveFilters; label: string }[] = [];

  if (filters.statut) chips.push({ key: 'statut', label: FILTER_CHIP_LABELS.statut[filters.statut] || filters.statut });
  if (filters.curation_status) chips.push({ key: 'curation_status', label: CURATION_LABELS[filters.curation_status] || filters.curation_status });
  if (filters.institution_id) {
    const inst = institutions.find((i) => i.id === filters.institution_id);
    chips.push({ key: 'institution_id', label: inst?.sigle || inst?.nom || filters.institution_id });
  }
  if (filters.type_code) chips.push({ key: 'type_code', label: filters.type_code });
  if (filters.recent) chips.push({ key: 'recent', label: FILTER_CHIP_LABELS.recent[filters.recent] || filters.recent });

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={() => onChange({ ...filters, [chip.key]: '' })}
          className="inline-flex items-center gap-1.5 h-6 px-2.5 bg-gold/10 border border-gold/20 text-gold text-[10px] font-mono rounded-full hover:bg-gold/20 transition-colors"
        >
          {chip.label}
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-current fill-none stroke-[2.5]">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─── Column helper ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<LaravelDocument>();

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LegalDocuments() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = hasRole(user, 'admin');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('-updated_at');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteTarget, setDeleteTarget] = useState<LaravelDocument | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isForceDelete, setIsForceDelete] = useState(false);
  const [embeddingInProgress, setEmbeddingInProgress] = useState<Set<string>>(new Set());
  const [embedTarget, setEmbedTarget] = useState<LaravelDocument | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const apiFilters: CatalogFilters = {
    page,
    per_page: 25,
    sort,
    search: debouncedSearch || undefined,
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => Boolean(v))),
    recent: filters.recent ? Number(filters.recent) : undefined,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['documents', apiFilters],
    queryFn: () => getCatalog(apiFilters),
    placeholderData: (prev) => prev,
    // Rafraîchit tant qu'une indexation tourne, qu'elle vienne du serveur
    // (job_batches) ou d'un clic local qui n'a pas encore été confirmé.
    refetchInterval: (query) => {
      const rows = query.state.data?.data;
      const serverActive = Array.isArray(rows) && rows.some((d) => d.embedding_in_progress);
      return serverActive || embeddingInProgress.size > 0 ? 3000 : false;
    },
  });

  const { data: institutionsData } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => getInstitutions() as Promise<{ data: { id: string; nom: string; sigle: string }[] }>,
    staleTime: 5 * 60 * 1000,
  });

  const { data: typesData } = useQuery({
    queryKey: ['document-types'],
    queryFn: () => getDocumentTypes() as Promise<{ data: { code: string; nom: string }[] }>,
    staleTime: 5 * 60 * 1000,
  });

  // Compteur « à valider » pour le bandeau de parcours vers l'ingestion.
  const { data: reviewData } = useQuery({
    queryKey: ['documents', 'review-count'],
    queryFn: () => getCatalog({ curation_status: 'review', per_page: 1 }),
    staleTime: 60_000,
  });
  const reviewCount = reviewData?.pagination?.total ?? 0;

  const institutions = institutionsData?.data ?? [];
  const types = (typesData?.data ?? []) as { code: string; nom: string }[];

  const rawDocs = data?.data;
  const docs = useMemo(() => (Array.isArray(rawDocs) ? rawDocs : []), [rawDocs]);
  const pagination = data?.pagination;
  const totalPages = pagination?.last_page ?? 1;

  const bulkMutation = useMutation({
    mutationFn: bulkUpdateDocuments,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setRowSelection({});
      toast.success(res.message || 'Documents mis à jour');
    },
    onError: (err) => toast.fromError(err, 'Échec de la mise à jour'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (payload: { ids: string[]; force?: boolean }) => bulkDeleteDocuments(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setRowSelection({});
      setShowBulkDeleteModal(false);
      setIsForceDelete(false);
      toast.success(res.message || 'Documents supprimés avec succès');
    },
    onError: (err) => toast.fromError(err, 'Échec de la suppression'),
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string; force?: boolean }) => deleteLegalDocument(payload.id, payload.force),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setRowSelection({});
      setDeleteTarget(null);
      setIsForceDelete(false);
      toast.success(res.message || 'Document supprimé');
    },
    onError: (err) => toast.fromError(err, 'Échec de la suppression'),
  });

  const embeddingMutation = useMutation({
    mutationFn: (id: string) => triggerDocumentEmbedding(id),
    onSuccess: (res, id) => {
      setEmbedTarget(null);
      // in_progress=false → rien à faire (déjà indexé) : on rafraîchit juste les compteurs.
      if (res.data?.in_progress) {
        setEmbeddingInProgress((prev) => new Set(prev).add(id));
        toast.info('Indexation pour la recherche IA lancée en arrière-plan');
      } else {
        toast.success('Document déjà indexé pour la recherche IA');
      }
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => toast.fromError(err, "Échec du lancement de l'indexation"),
  });

  const cancelEmbeddingMutation = useMutation({
    mutationFn: (id: string) => cancelDocumentEmbedding(id),
    onSuccess: (_, id) => {
      setEmbeddingInProgress((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.info('Indexation interrompue (le travail déjà fait est conservé)');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => toast.fromError(err, "Échec de l'interruption"),
  });

  // Réconcilie le Set optimiste avec la vérité serveur : on retire un doc dès que
  // le serveur confirme l'indexation (il pilote alors la barre) ou qu'elle est finie.
  useEffect(() => {
    if (embeddingInProgress.size === 0 || docs.length === 0) return;
    setEmbeddingInProgress((prev) => {
      const next = new Set(prev);
      let changed = false;
      docs.forEach((doc) => {
        const done = (doc.embedded_articles_count ?? 0) >= (doc.articles_count ?? 1);
        if (prev.has(doc.id) && (doc.embedding_in_progress || done)) {
          next.delete(doc.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [docs]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedIds = useMemo(
    () => Object.entries(rowSelection).filter(([, v]) => v).map(([idx]) => docs[Number(idx)]?.id).filter(Boolean),
    [rowSelection, docs],
  );

  const handleBulkAction = useCallback(
    (action: 'set_curation_status' | 'set_statut', value: string) => {
      if (selectedIds.length === 0) return;
      bulkMutation.mutate({ ids: selectedIds as string[], action, value });
    },
    [selectedIds, bulkMutation],
  );

  const handleFiltersChange = useCallback((f: ActiveFilters) => {
    setFilters(f);
    setPage(1);
  }, []);

  // ─── Columns ───────────────────────────────────────────────────────────────

  const columns = useMemo(
    () => [
      // Checkbox
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => { if (el) el.indeterminate = table.getIsSomePageRowsSelected(); }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-3.5 h-3.5 accent-gold rounded cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-3.5 h-3.5 accent-gold rounded cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 40,
      }),

      // Titre & référence
      columnHelper.display({
        id: 'titre',
        header: 'Titre & Référence',
        cell: ({ row }) => {
          const doc = row.original;
          const titre = docTitle(doc);
          return (
            <Link to={`/editor/viewer/${doc.id}`} className="flex flex-col min-w-[280px] max-w-[380px]">
              <span className={`font-body text-sm font-medium line-clamp-2 group-hover:text-gold transition-colors hover:underline ${titre ? 'text-t1' : 'text-t4 italic'}`}>
                {titre || '(Sans titre)'}
              </span>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {doc.reference_nor && (
                  <span className="text-t3 text-[10px] font-mono bg-s2 px-1.5 py-0.5 rounded border border-b1">
                    {doc.reference_nor}
                  </span>
                )}
                {doc.document_role && (
                  <span className="text-t4 text-[10px] font-mono italic">{doc.document_role}</span>
                )}
              </div>
            </Link>
          );
        },
      }),

      // Type
      columnHelper.accessor((row) => row.type?.code || row.type_code, {
        id: 'type',
        header: 'Type',
        cell: (info) => (
          <span className="text-t2 text-[10px] font-mono bg-s2 px-2 py-1 rounded border border-b1 whitespace-nowrap">
            {info.getValue() || '—'}
          </span>
        ),
        size: 80,
      }),

      // Institution
      columnHelper.accessor((row) => row.institution?.sigle || row.institution?.nom, {
        id: 'institution',
        header: 'Institution',
        cell: (info) => (
          <span className="text-t2 text-xs whitespace-nowrap">{info.getValue() || '—'}</span>
        ),
        size: 100,
      }),

      // Indicateurs
      columnHelper.display({
        id: 'indicators',
        header: 'Complétude',
        cell: ({ row }) => <CompletenessIndicators doc={row.original} />,
        size: 120,
      }),

      // Embedding
      columnHelper.display({
        id: 'embedding',
        header: SEARCH_AI_LABEL,
        cell: ({ row }) => (
          <EmbeddingStatusCell
            doc={row.original}
            isInProgress={Boolean(row.original.embedding_in_progress) || embeddingInProgress.has(row.original.id)}
            onEmbed={(doc) => setEmbedTarget(doc)}
            onCancel={(id) => cancelEmbeddingMutation.mutate(id)}
            isTriggering={embeddingMutation.isPending && embeddingMutation.variables === row.original.id}
            isCancelling={cancelEmbeddingMutation.isPending && cancelEmbeddingMutation.variables === row.original.id}
          />
        ),
        size: 150,
      }),

      // Validité
      columnHelper.accessor('statut', {
        header: 'Validité',
        cell: (info) => {
          const v = info.getValue();
          if (!v) return <span className="text-t4 text-xs">—</span>;
          return <Badge label={STATUT_LABELS[v] || v} cfg={STATUT_CFG[v] || 'text-t3 bg-s2 border-b1'} />;
        },
        size: 100,
      }),

      // Curation
      columnHelper.accessor('curation_status', {
        header: 'Curation',
        cell: (info) => {
          const v = info.getValue() ?? '';
          return <Badge label={CURATION_LABELS[v] || v || '—'} cfg={CURATION_CFG[v] || 'text-t3 bg-s2 border-b1'} />;
        },
        size: 100,
      }),

      // Dernière modif (audit)
      columnHelper.accessor('updated_at', {
        header: 'Modifié',
        cell: (info) => (
          <span className="text-t3 text-[10px] font-mono whitespace-nowrap" title={info.getValue() || ''}>
            {timeAgo(info.getValue())}
          </span>
        ),
        size: 90,
      }),

      // Actions
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const doc = row.original;
          return (
            <div className="flex items-center gap-1.5 justify-end">
              <Link
                to={`/editor/viewer/${doc.id}`}
                className="inline-flex items-center gap-1 h-7 px-3 text-[10px] font-mono text-gold bg-gold/10 border border-gold/20 rounded-md hover:bg-gold/20 transition-all whitespace-nowrap"
              >
                Éditer
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(doc);
                }}
                className="inline-flex items-center gap-1 h-7 px-3 text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-md hover:bg-red-500/15 transition-all whitespace-nowrap"
              >
                Supprimer
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        },
        size: 140,
      }),
    ],
    [isAdmin, embeddingInProgress, embeddingMutation, cancelEmbeddingMutation],
  );

  // TanStack Table expose des callbacks non compatibles avec React Compiler.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: docs,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <AppLayout>
      <div className="h-full overflow-hidden flex flex-col bg-bg">
        <div className="flex-1 flex flex-col max-w-screen-2xl mx-auto w-full px-4 md:px-6 py-6 space-y-4 overflow-hidden min-h-0">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.5]">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <path d="M8 7h8M8 11h5" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-display font-semibold text-t1">Documents juridiques</h1>
                <p className="text-t3 text-[11px] font-mono mt-0.5">
                  {pagination?.total != null ? `${formatCompactNumber(pagination.total)} document${pagination.total > 1 ? 's' : ''}` : '…'}
                  {isFetching && !isLoading && <span className="ml-2 opacity-60 animate-pulse">↻</span>}
                </p>
              </div>
            </div>
            <Link
              to="/editor/ingestion"
              className="self-start sm:self-auto inline-flex items-center gap-2 h-9 px-4 bg-gold text-on-gold rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-gold/10 shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nouveau
            </Link>
          </div>

          {/* ── Bandeau parcours : documents en attente de validation ──────── */}
          {reviewCount > 0 && (
            <Link
              to="/editor/ingestion"
              className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-400/10 border border-amber-400/20 rounded-xl text-amber-400 hover:bg-amber-400/15 transition-colors text-sm"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2 shrink-0">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="flex-1">
                <strong>{formatCompactNumber(reviewCount)}</strong> document{reviewCount > 1 ? 's' : ''} en attente de validation dans l'ingestion
              </span>
              <span className="font-mono text-xs shrink-0">Ouvrir →</span>
            </Link>
          )}

          {/* ── Search + Filter toggle ────────────────────────────────────── */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] group">
              <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 stroke-t3 group-focus-within:stroke-gold fill-none stroke-[1.5] transition-colors pointer-events-none">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Titre, NOR, code stock…"
                className="w-full h-10 bg-s1 border border-b1 rounded-xl text-t1 pl-10 pr-4 text-sm outline-none focus:border-gold/50 focus:ring-4 focus:ring-gold/5 placeholder:text-t4 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 hover:text-t1 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`h-10 px-4 border rounded-xl text-xs font-mono flex items-center gap-2 transition-all shrink-0 ${
                showFilters || activeFilterCount > 0
                  ? 'bg-gold/10 border-gold/30 text-gold'
                  : 'bg-s1 border-b1 text-t2 hover:text-t1 hover:border-gold/20'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filtres
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-gold text-on-gold text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="h-10 px-3 bg-s1 border border-b1 rounded-xl text-t2 text-xs font-mono focus:outline-none focus:border-gold/40 appearance-none shrink-0"
            >
              <option value="-updated_at">Modifié récemment</option>
              <option value="-created_at">Créé récemment</option>
              <option value="titre_officiel">Titre A→Z</option>
              <option value="-titre_officiel">Titre Z→A</option>
              <option value="-date_publication">Publi. récente</option>
              <option value="curation_status">Curation</option>
            </select>
          </div>

          {/* ── Filter panel ─────────────────────────────────────────────── */}
          {showFilters && (
            <FilterPanel
              filters={filters}
              onChange={handleFiltersChange}
              onClose={() => setShowFilters(false)}
              institutions={institutions}
              types={types}
            />
          )}

          {/* ── Active filter chips ───────────────────────────────────────── */}
          <FilterChips filters={filters} onChange={handleFiltersChange} institutions={institutions} />

          {/* ── Bulk action bar ───────────────────────────────────────────── */}
          {selectedIds.length > 0 && (
            <BulkBar
              count={selectedIds.length}
              onDeselect={() => setRowSelection({})}
              onAction={handleBulkAction}
              onDelete={() => setShowBulkDeleteModal(true)}
              isLoading={bulkMutation.isPending}
            />
          )}

          {/* ── Liste : tableau ≥ lg, cartes empilées en dessous ─────────── */}
          <div className="flex-1 min-h-0 bg-s1 border border-b1 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              {/* Cartes (mobile / tablette) */}
              <div className="lg:hidden divide-y divide-b1/40">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="p-4 space-y-2">
                      <div className="h-3.5 bg-s2 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-s2 rounded animate-pulse w-1/3" />
                    </div>
                  ))
                ) : docs.length === 0 ? (
                  <div className="px-6 py-16 text-center flex flex-col items-center gap-3 text-t3">
                    <span className="font-mono text-xs uppercase tracking-widest">Aucun document trouvé</span>
                    {(search || activeFilterCount > 0) && (
                      <button
                        onClick={() => { setSearch(''); setFilters(EMPTY_FILTERS); }}
                        className="text-gold text-[11px] font-mono hover:underline"
                      >
                        Effacer les filtres
                      </button>
                    )}
                  </div>
                ) : (
                  table.getRowModel().rows.map((row) => {
                    const doc = row.original;
                    const titre = docTitle(doc);
                    return (
                      <div
                        key={row.id}
                        className={`p-4 transition-colors ${row.getIsSelected() ? 'bg-gold/5' : 'hover:bg-s2/40'}`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={row.getIsSelected()}
                            onChange={row.getToggleSelectedHandler()}
                            className="mt-1 w-4 h-4 accent-gold rounded cursor-pointer shrink-0"
                            aria-label="Sélectionner"
                          />
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/editor/viewer/${doc.id}`}
                              className={`block font-body text-sm font-medium line-clamp-2 hover:text-gold transition-colors ${titre ? 'text-t1' : 'text-t4 italic'}`}
                            >
                              {titre || '(Sans titre)'}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <Badge label={CURATION_LABELS[doc.curation_status ?? ''] || doc.curation_status || '—'} cfg={CURATION_CFG[doc.curation_status ?? ''] || 'text-t3 bg-s2 border-b1'} />
                              {doc.statut && <Badge label={STATUT_LABELS[doc.statut] || doc.statut} cfg={STATUT_CFG[doc.statut] || 'text-t3 bg-s2 border-b1'} />}
                              <span className="text-t3 text-[10px] font-mono bg-s2 px-1.5 py-0.5 rounded border border-b1">
                                {doc.type?.code || doc.type_code || '—'}
                              </span>
                              {(doc.institution?.sigle || doc.institution?.nom) && (
                                <span className="text-t3 text-[10px] font-mono">{doc.institution?.sigle || doc.institution?.nom}</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-2.5">
                              <CompletenessIndicators doc={doc} />
                              <span className="text-t4 text-[10px] font-mono whitespace-nowrap">{timeAgo(doc.updated_at)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <Link
                                to={`/editor/viewer/${doc.id}`}
                                className="inline-flex items-center gap-1 h-8 px-3 text-[11px] font-mono text-gold bg-gold/10 border border-gold/20 rounded-md hover:bg-gold/20 transition-all"
                              >
                                Éditer
                              </Link>
                              <button
                                onClick={() => setDeleteTarget(doc)}
                                className="inline-flex items-center gap-1 h-8 px-3 text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-md hover:bg-red-500/15 transition-all"
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Tableau (desktop large) */}
              <table className="hidden lg:table w-full text-sm border-separate border-spacing-0">
                <thead className="bg-s2/60 sticky top-0 z-10 backdrop-blur-md">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((header) => (
                        <th
                          key={header.id}
                          className="text-left px-4 py-3 text-t3 font-mono text-[10px] uppercase tracking-widest font-semibold border-b border-b1 whitespace-nowrap"
                          style={{ width: header.column.columnDef.size }}
                        >
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-b1/40">
                  {isLoading ? (
                    // Skeleton rows
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {columns.map((_, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-3 bg-s2 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : docs.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-t3">
                          <div className="w-10 h-10 rounded-xl bg-s2 flex items-center justify-center border border-b1 opacity-50">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="font-mono text-xs uppercase tracking-widest">Aucun document trouvé</span>
                          {(search || activeFilterCount > 0) && (
                            <button
                              onClick={() => { setSearch(''); setFilters(EMPTY_FILTERS); }}
                              className="text-gold text-[11px] font-mono hover:underline"
                            >
                              Effacer les filtres
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => navigate(`/editor/viewer/${row.original.id}`)}
                        className={`transition-colors group cursor-pointer ${row.getIsSelected() ? 'bg-gold/5' : 'hover:bg-s2/40'}`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 align-middle">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ─────────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-s2/30 border-t border-b1 flex-wrap gap-2 shrink-0">
                <span className="text-t3 text-[10px] font-mono">
                  Page <strong className="text-t1">{page}</strong> / <strong className="text-t1">{totalPages}</strong>
                  {pagination?.total && (
                    <span className="ml-2">— {formatCompactNumber(pagination.total)} total</span>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                    className="h-7 w-7 flex items-center justify-center text-t3 bg-s1 border border-b1 rounded hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-all"
                    title="Première page"
                  >«</button>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="h-7 px-3 text-[10px] font-mono text-t2 bg-s1 border border-b1 rounded-lg hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >← Préc.</button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-7 px-3 text-[10px] font-mono text-t2 bg-s1 border border-b1 rounded-lg hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >Suiv. →</button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                    className="h-7 w-7 flex items-center justify-center text-t3 bg-s1 border border-b1 rounded hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-all"
                    title="Dernière page"
                  >»</button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setIsForceDelete(false); } }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Supprimer ce document ?</DialogTitle>
            <DialogDescription>
              {isAdmin && isForceDelete ? (
                <span className="text-red-500 font-semibold">
                  Attention : Vous êtes sur le point de supprimer DÉFINITIVEMENT ce document. Cette action est irréversible.
                </span>
              ) : (
                'Cette action masque le document (soft delete). Les utilisateurs ne le verront plus dans le catalogue ni dans la recherche.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 text-xs font-mono text-t3 bg-s2 border border-b1 rounded-lg p-3">
            {deleteTarget ? docTitle(deleteTarget) || deleteTarget.id : ''}
          </div>

          {/* Impact détaillé de la purge — visible pour les admins (autorisés à la
              suppression définitive), même UX que le viewer. */}
          {isAdmin && deleteTarget && <DeletionImpactPanel documentId={deleteTarget.id} />}

          {isAdmin && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <input
                type="checkbox"
                id="force-delete-single"
                checked={isForceDelete}
                onChange={(e) => setIsForceDelete(e.target.checked)}
                className="mt-1 w-4 h-4 accent-red-500 rounded cursor-pointer"
              />
              <label htmlFor="force-delete-single" className="text-xs text-t2 cursor-pointer">
                <span className="font-semibold text-red-400 block mb-0.5">Suppression définitive</span>
                Cochez cette case pour détruire totalement ces données de la base de données.
              </label>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => { if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id, force: isForceDelete }); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showBulkDeleteModal} onOpenChange={(open) => { if (!open) { setShowBulkDeleteModal(false); setIsForceDelete(false); } }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Supprimer {selectedIds.length} document{selectedIds.length > 1 ? 's' : ''} ?</DialogTitle>
            <DialogDescription>
              {isAdmin && isForceDelete ? (
                <span className="text-red-500 font-semibold">
                  Attention : Vous êtes sur le point de supprimer DÉFINITIVEMENT ces documents. Cette action est irréversible.
                </span>
              ) : (
                'Cette action masque les documents (soft delete). Les utilisateurs ne les verront plus dans le catalogue ni dans la recherche.'
              )}
            </DialogDescription>
          </DialogHeader>

          {isAdmin && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <input
                type="checkbox"
                id="force-delete-bulk"
                checked={isForceDelete}
                onChange={(e) => setIsForceDelete(e.target.checked)}
                className="mt-1 w-4 h-4 accent-red-500 rounded cursor-pointer"
              />
              <label htmlFor="force-delete-bulk" className="text-xs text-t2 cursor-pointer">
                <span className="font-semibold text-red-400 block mb-0.5">Suppression définitive</span>
                Cochez cette case pour détruire totalement ces données de la base de données.
              </label>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBulkDeleteModal(false)}
              disabled={bulkDeleteMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => bulkDeleteMutation.mutate({ ids: selectedIds as string[], force: isForceDelete })}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <EmbedConfirmDialog
        doc={embedTarget}
        onClose={() => setEmbedTarget(null)}
        onConfirm={(id) => embeddingMutation.mutate(id)}
        isPending={embeddingMutation.isPending}
      />
    </AppLayout>
  );
}

// ─── Embedding confirmation dialog ────────────────────────────────────────────

interface EmbedConfirmDialogProps {
  doc: LaravelDocument | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  isPending: boolean;
}

function EmbedConfirmDialog({ doc, onClose, onConfirm, isPending }: EmbedConfirmDialogProps) {
  const total = doc?.articles_count ?? 0;
  const embedded = doc?.embedded_articles_count ?? 0;
  const pending = Math.max(0, total - embedded);
  const isLarge = pending > 100;
  const isResume = embedded > 0;

  return (
    <Dialog open={Boolean(doc)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.8]">
                <circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
            </span>
            Indexer ce document pour l'IA ?
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-1">
            <span className="block">
              L'indexation transforme chaque article en « empreinte numérique » qui permet à
              l'<strong className="text-t2">assistant IA</strong> et à la <strong className="text-t2">recherche intelligente</strong>{' '}
              de retrouver et citer ce document. Sans elle, le document reste invisible pour ces fonctionnalités.
            </span>
            <span className="block text-t2">
              {isResume
                ? <>Il reste <strong className="text-violet-400">{pending}</strong> article(s) à indexer sur {total}.</>
                : <><strong className="text-violet-400">{pending}</strong> article(s) seront indexés.</>}
            </span>
            <span className="block text-[13px] text-t3">
              Le traitement se fait en arrière-plan, par petits lots. Vous pouvez continuer à
              travailler ou quitter la page — il se poursuit tout seul, et vous pourrez l'interrompre à tout moment.
            </span>
            {isLarge && (
              <span className="flex items-start gap-2 text-[13px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg p-2.5">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2 shrink-0 mt-0.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Ce document est volumineux : l'indexation peut prendre plusieurs minutes.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => { if (doc) onConfirm(doc.id); }}
            disabled={isPending}
            className="bg-violet-500 text-white hover:bg-violet-600"
          >
            {isPending ? 'Lancement…' : "Lancer l'indexation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * LegalDocuments.tsx — Gestion pro des documents juridiques.
 * A. Filtres avancés  B. Indicateurs de complétude
 * C. Audit            D. Actions en masse
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
  getInstitutions,
  getDocumentTypes,
  deleteLegalDocument,
  type LaravelDocument,
  type CatalogFilters,
} from '@/features/documents/api/laravelApi';
import AppLayout from '@/shared/components/layout/AppLayout';
import { useAuthStore } from '@/features/auth/store/authStore';
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

function docTitle(doc: LaravelDocument): string {
  return doc.titre_officiel || doc.title || '';
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
  isLoading: boolean;
}

function BulkBar({ count, onDeselect, onAction, isLoading }: BulkBarProps) {
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
      // Simple toast-like feedback via title bar (no toast component needed)
      console.info(res.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLegalDocument(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setRowSelection({});
      setDeleteTarget(null);
      console.info(res.message || 'Document supprimé');
    },
  });

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
              {isAdmin && (
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
              )}
            </div>
          );
        },
        size: 140,
      }),
    ],
    [isAdmin],
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
                  {pagination?.total != null ? `${pagination.total.toLocaleString('fr-FR')} document${pagination.total > 1 ? 's' : ''}` : '…'}
                  {isFetching && !isLoading && <span className="ml-2 opacity-60 animate-pulse">↻</span>}
                </p>
              </div>
            </div>
            <Link
              to="/editor/ingestion"
              className="self-start sm:self-auto inline-flex items-center gap-2 h-9 px-4 bg-gold text-[#120e00] rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-gold/10 shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nouveau
            </Link>
          </div>

          {/* ── Search + Filter toggle ────────────────────────────────────── */}
          <div className="flex gap-2">
            <div className="relative flex-1 group">
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
                <span className="w-4 h-4 rounded-full bg-gold text-[#120e00] text-[9px] font-bold flex items-center justify-center">
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
              isLoading={bulkMutation.isPending}
            />
          )}

          {/* ── Table ────────────────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 bg-s1 border border-b1 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
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
                        className={`transition-colors group cursor-default ${row.getIsSelected() ? 'bg-gold/5' : 'hover:bg-s2/40'}`}
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
                    <span className="ml-2">— {pagination.total.toLocaleString('fr-FR')} total</span>
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
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Supprimer ce document ?</DialogTitle>
            <DialogDescription>
              Cette action masque le document (soft delete). Les utilisateurs ne le verront plus dans le catalogue ni dans la recherche.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 text-xs font-mono text-t3 bg-s2 border border-b1 rounded-lg p-3">
            {deleteTarget ? docTitle(deleteTarget) || deleteTarget.id : ''}
          </div>

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
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

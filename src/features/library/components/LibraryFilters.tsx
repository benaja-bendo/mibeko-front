/**
 * LibraryFilters.tsx — Filtres latéraux de la Bibliothèque (100% serveur).
 *
 * Tous les filtres correspondent à de vrais paramètres backend :
 *  - périmètre juridique (`legal_scope`) ;
 *  - type de document (`type`) ;
 *  - institution émettrice (`institution_id`) ;
 *  - bornes de date de publication (`date_from`/`date_to`) ;
 *  - tri (`sort`).
 */

import { RotateCcw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/Select';
import {
  useDocumentTypes,
  useInstitutions,
} from '@/features/library/hooks/useLibrary';
import {
  SCOPE_LABELS,
  type LegalScope,
  type LibraryFilterState,
  type SearchSort,
} from '@/features/library/types';

interface LibraryFiltersProps {
  filters: LibraryFilterState;
  onChange: (patch: Partial<LibraryFilterState>) => void;
  onReset: () => void;
}

const SCOPES: { value: LegalScope; label: string }[] = [
  { value: 'all', label: 'Tous périmètres' },
  { value: 'national', label: SCOPE_LABELS.national },
  { value: 'ohada', label: SCOPE_LABELS.ohada },
  { value: 'communautaire', label: SCOPE_LABELS.communautaire },
];

const SORTS: { value: SearchSort; label: string }[] = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'date_desc', label: 'Plus récents' },
  { value: 'date_asc', label: 'Plus anciens' },
];

/** Section de filtre avec titre. */
function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="px-1 text-[10px] font-mono uppercase tracking-widest text-t4">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function LibraryFilters({
  filters,
  onChange,
  onReset,
}: LibraryFiltersProps) {
  const { data: types, isLoading: loadingTypes } = useDocumentTypes();
  const { data: institutions } = useInstitutions();

  const hasActiveFilters =
    filters.typeCode !== null ||
    filters.legalScope !== 'all' ||
    filters.institutionId !== null ||
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.sort !== 'relevance';

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-t1">Filtres</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] text-t3 transition-colors hover:text-gold"
          >
            <RotateCcw className="h-3 w-3" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Périmètre */}
      <FilterSection title="Périmètre">
        <div className="flex flex-col gap-0.5">
          {SCOPES.map((scope) => (
            <label
              key={scope.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-t2 transition-colors hover:bg-s2"
            >
              <input
                type="radio"
                name="scope"
                checked={filters.legalScope === scope.value}
                onChange={() => onChange({ legalScope: scope.value })}
                className="accent-gold"
              />
              {scope.label}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Type de texte */}
      <FilterSection title="Type de texte">
        <div className="flex max-h-52 flex-col gap-0.5 overflow-y-auto">
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-t2 transition-colors hover:bg-s2">
            <input
              type="radio"
              name="type"
              checked={!filters.typeCode}
              onChange={() => onChange({ typeCode: null })}
              className="accent-gold"
            />
            Tous les types
          </label>
          {loadingTypes &&
            [...Array(4)].map((_, i) => (
              <div key={i} className="mx-1 h-6 animate-pulse rounded bg-s2" />
            ))}
          {types?.map((type) => (
            <label
              key={type.code}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-t2 transition-colors hover:bg-s2"
            >
              <input
                type="radio"
                name="type"
                checked={filters.typeCode === type.code}
                onChange={() => onChange({ typeCode: type.code })}
                className="accent-gold"
              />
              <span className="truncate">{type.name}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Institution */}
      <FilterSection title="Institution">
        <Select
          value={filters.institutionId ?? 'all'}
          onValueChange={(v) =>
            onChange({ institutionId: v === 'all' ? null : v })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Toutes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les institutions</SelectItem>
            {institutions?.map((inst) => (
              <SelectItem key={inst.id} value={inst.id}>
                {inst.acronym ? `${inst.acronym} — ` : ''}
                {inst.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>

      {/* Dates de publication */}
      <FilterSection title="Publié entre">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => onChange({ dateFrom: e.target.value || null })}
            className="h-8 rounded-md border border-b1 bg-s2 px-2 text-xs text-t1 focus:outline-none focus:ring-1 focus:ring-gold/40"
          />
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => onChange({ dateTo: e.target.value || null })}
            className="h-8 rounded-md border border-b1 bg-s2 px-2 text-xs text-t1 focus:outline-none focus:ring-1 focus:ring-gold/40"
          />
        </div>
      </FilterSection>

      {/* Tri */}
      <FilterSection title="Trier par">
        <Select
          value={filters.sort}
          onValueChange={(v) => onChange({ sort: v as SearchSort })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>
    </div>
  );
}

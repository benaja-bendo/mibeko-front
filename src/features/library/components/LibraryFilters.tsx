/**
 * LibraryFilters.tsx — Filtres latéraux de la Bibliothèque.
 *
 * - Type de document (Code, Loi, Décret… depuis l'API) → filtre serveur.
 * - Périmètre (Tous / Droit congolais / OHADA) → filtre client.
 * - Réponse de synthèse IA (RAG) → activé/désactivé.
 */

import { Sparkles } from 'lucide-react';
import { useDocumentTypes } from '@/features/library/hooks/useLibrary';
import type {
  LegalScope,
  LibraryFilterState,
} from '@/features/library/types';

interface LibraryFiltersProps {
  filters: LibraryFilterState;
  onChange: (patch: Partial<LibraryFilterState>) => void;
}

const SCOPES: { value: LegalScope; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'congo', label: 'Droit congolais' },
  { value: 'ohada', label: 'OHADA' },
];

/** Petit titre de section de filtre. */
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
}: LibraryFiltersProps) {
  const { data: types, isLoading } = useDocumentTypes();

  return (
    <div className="space-y-6 p-4">
      {/* Synthèse IA */}
      <FilterSection title="Assistance">
        <button
          type="button"
          onClick={() => onChange({ rag: !filters.rag })}
          className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
            filters.rag
              ? 'border-gold/30 bg-gold/10'
              : 'border-b1 bg-s1 hover:bg-s2'
          }`}
        >
          <span className="flex items-center gap-2">
            <Sparkles
              className={`h-4 w-4 ${filters.rag ? 'text-gold' : 'text-t3'}`}
            />
            <span className="text-xs font-medium text-t1">Synthèse IA</span>
          </span>
          <span
            className={`relative h-4 w-7 rounded-full transition-colors ${
              filters.rag ? 'bg-gold' : 'bg-s4'
            }`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-bg transition-transform ${
                filters.rag ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>
        <p className="px-1 text-[10px] leading-snug text-t4">
          Génère une réponse rédigée à partir des textes trouvés.
        </p>
      </FilterSection>

      {/* Périmètre */}
      <FilterSection title="Périmètre">
        <div className="flex flex-col gap-1">
          {SCOPES.map((scope) => (
            <label
              key={scope.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-t2 transition-colors hover:bg-s2"
            >
              <input
                type="radio"
                name="scope"
                checked={filters.scope === scope.value}
                onChange={() => onChange({ scope: scope.value })}
                className="accent-gold"
              />
              {scope.label}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Type de document */}
      <FilterSection title="Type de texte">
        <div className="flex flex-col gap-1">
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

          {isLoading && (
            <div className="space-y-1 px-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-6 animate-pulse rounded bg-s2" />
              ))}
            </div>
          )}

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
    </div>
  );
}

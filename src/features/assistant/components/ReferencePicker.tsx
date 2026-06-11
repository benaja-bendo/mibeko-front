/**
 * ReferencePicker.tsx — Sélecteur de références juridiques du composer.
 *
 * Panneau ancré au-dessus du champ de saisie (ouvert via le bouton « @ » ou en
 * tapant « @ » dans le textarea). Permet d'épingler un ou plusieurs documents
 * publiés (codes, lois, constitution…) : la recherche de l'IA est alors
 * restreinte à ces textes pour des réponses ciblées.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookMarked, Loader2, ScrollText, Search } from 'lucide-react';
import { searchReferences } from '@/features/assistant/api/assistantApi';
import type { AssistantReference } from '@/features/assistant/types';

interface ReferencePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (reference: AssistantReference) => void;
  /** Documents déjà épinglés (grisés dans la liste). */
  selectedIds: string[];
}

export default function ReferencePicker({
  open,
  onClose,
  onSelect,
  selectedIds,
}: ReferencePickerProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Anti-rebond : on n'interroge le serveur que 250 ms après la dernière frappe.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Focus + remise à zéro à chaque ouverture.
  useEffect(() => {
    if (open) {
      setQuery('');
      setDebouncedQuery('');
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Fermeture au clic extérieur et à Échap.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['assistant', 'references', debouncedQuery],
    queryFn: () => searchReferences(debouncedQuery),
    enabled: open,
    staleTime: 60_000,
  });

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full left-0 z-20 mb-2 w-full max-w-md overflow-hidden rounded-xl border border-b1 bg-bg shadow-lg"
    >
      {/* En-tête : finalité + champ de recherche */}
      <div className="border-b border-b1 p-2">
        <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-t4">
          <BookMarked className="h-3 w-3 text-gold" />
          Cibler la recherche sur un texte
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-b1 bg-s1 px-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-t3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Code du travail, loi de finances…"
            className="w-full bg-transparent py-1.5 text-xs text-t1 placeholder:text-t3 focus:outline-none"
          />
          {isFetching && (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gold" />
          )}
        </div>
      </div>

      {/* Résultats */}
      <div className="max-h-56 overflow-y-auto p-1">
        {results.length === 0 && !isFetching ? (
          <p className="px-3 py-4 text-center text-xs text-t3">
            Aucun texte publié ne correspond.
          </p>
        ) : (
          results.map((doc) => {
            const alreadySelected = selectedIds.includes(doc.id);
            return (
              <button
                key={doc.id}
                type="button"
                disabled={alreadySelected}
                onClick={() => {
                  onSelect(doc);
                  onClose();
                }}
                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-s2 disabled:cursor-default disabled:opacity-40"
              >
                <ScrollText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-t1">
                    {doc.title}
                  </span>
                  {doc.type_name && (
                    <span className="block text-[10px] text-t3">
                      {doc.type_name}
                      {alreadySelected ? ' · déjà épinglé' : ''}
                    </span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

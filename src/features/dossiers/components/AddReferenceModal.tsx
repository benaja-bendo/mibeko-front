/**
 * AddReferenceModal.tsx — Ajout de références juridiques SANS quitter le dossier.
 *
 * Recherche full-text dans la base (réutilise `useLibrarySearch`) et ajoute les
 * articles choisis aux références du dossier. La liste se met à jour en direct
 * (les éléments déjà rattachés sont marqués). La Bibliothèque pleine page reste
 * accessible en « recherche avancée » (échappatoire).
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ExternalLink, Loader2, Plus, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { useLibrarySearch } from '@/features/library/hooks/useLibrary';
import type { SearchResultItem } from '@/features/library/types';
import { useDossierAnnexes } from '@/features/dossiers/store/useDossierAnnexes';
import { useDossier } from '@/features/dossiers/hooks/useDossiers';

interface AddReferenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
}

export default function AddReferenceModal({
  open,
  onOpenChange,
  dossierId,
}: AddReferenceModalProps) {
  const navigate = useNavigate();
  const { addReference } = useDossierAnnexes();
  const dossier = useDossier(dossierId);
  const addedIds = useMemo(
    () => new Set((dossier?.references ?? []).map((r) => r.id)),
    [dossier?.references],
  );

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setDebounced('');
    }
  }, [open]);

  const { data, isFetching } = useLibrarySearch({ q: debounced, page: 1, perPage: 8 });
  const results = data?.results ?? [];
  const tooShort = debounced.length < 2;

  const add = (item: SearchResultItem) =>
    addReference(dossierId, {
      id: item.id,
      type: 'article',
      title: item.document_title || 'Document',
      breadcrumb: item.breadcrumb ?? undefined,
      number: item.number ?? undefined,
    });

  const openAdvanced = () => {
    onOpenChange(false);
    navigate(`/app/library?addTo=${dossierId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une référence</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-t3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un article, un code…"
            autoFocus
            className="h-10 w-full rounded-md border border-b1 bg-s2 pl-9 pr-9 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:ring-1 focus:ring-gold"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-t3" />
          )}
        </div>

        <div className="max-h-80 min-h-[8rem] space-y-1.5 overflow-y-auto">
          {tooShort ? (
            <p className="py-10 text-center text-xs text-t3">
              Tapez au moins 2 caractères pour rechercher dans la base.
            </p>
          ) : results.length === 0 && !isFetching ? (
            <p className="py-10 text-center text-xs text-t3">
              Aucun résultat pour «&nbsp;{debounced}&nbsp;».
            </p>
          ) : (
            results.map((item) => {
              const added = addedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-lg border border-b1 bg-s1 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-t1">
                      {item.document_title || 'Document'}
                      {item.number ? ` · Art. ${item.number}` : ''}
                    </p>
                    {item.breadcrumb && (
                      <p className="truncate font-mono text-[10px] text-t3">
                        {item.breadcrumb}
                      </p>
                    )}
                  </div>
                  {added ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-md bg-green-d px-2 py-1 text-[11px] font-medium text-green">
                      <Check className="h-3.5 w-3.5" />
                      Ajouté
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => add(item)}
                      className="flex shrink-0 items-center gap-1 rounded-md border border-b1 px-2 py-1 text-[11px] font-medium text-gold transition-colors hover:bg-gold/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={openAdvanced}
          className="flex items-center justify-center gap-1.5 border-t border-b1 pt-3 text-xs text-t2 transition-colors hover:text-t1"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Recherche avancée dans la Bibliothèque
        </button>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { SearchX, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useMyMissingTextRequests } from '@/features/library/hooks/useMissingTextRequests';
import RequestMissingTextModal from '@/features/library/components/RequestMissingTextModal';

const date = (value: string) => new Date(value).toLocaleDateString('fr-FR');

/**
 * Recherche sans résultat (mibeko-front#34) : ne jamais laisser l'utilisateur
 * sur une impasse muette — retrait des filtres actifs, reformulation
 * explicite, et une sortie utile (« demander ce texte », qu'il retrouve
 * ensuite ici même).
 */
export default function EmptySearchState({
  query,
  activeFilterCount,
  onResetFilters,
  onReformulate,
}: {
  query: string;
  activeFilterCount: number;
  onResetFilters: () => void;
  onReformulate: (nextQuery: string) => void;
}) {
  const [draft, setDraft] = useState(query);
  const [modalOpen, setModalOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const requests = useMyMissingTextRequests(requestsOpen);

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <SearchX className="h-7 w-7 text-t3" />
      <div>
        <p className="text-sm text-t2">
          Aucun texte pour «&nbsp;{query}&nbsp;».
        </p>
        <p className="text-xs text-t3">
          Le catalogue ne le trouve pas aujourd’hui — cela ne veut pas dire qu’il
          n’existe pas.
        </p>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" size="sm" onClick={onResetFilters}>
          Retirer les {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif
          {activeFilterCount > 1 ? 's' : ''} et relancer
        </Button>
      )}

      <div className="w-full max-w-xs space-y-2 text-left">
        <label className="block text-[11px] text-t3" htmlFor="reformulate-query">
          Reformuler : moins de mots-clés, au singulier, sans sigle.
        </label>
        <div className="flex gap-1.5">
          <input
            id="reformulate-query"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && draft.trim()) onReformulate(draft);
            }}
            className="h-8 flex-1 rounded-md border border-b1 bg-s1 px-2 text-xs text-t1 focus:outline-none focus:ring-1 focus:ring-gold"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!draft.trim() || draft.trim() === query}
            onClick={() => onReformulate(draft)}
          >
            Relancer
          </Button>
        </div>
      </div>

      <Button variant="gold" size="sm" onClick={() => setModalOpen(true)}>
        Demander ce texte
      </Button>

      <button
        type="button"
        onClick={() => setRequestsOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-t3 hover:text-t2"
      >
        Vos demandes de texte
        {requestsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {requestsOpen && (
        <div className="w-full max-w-xs text-left">
          {requests.isPending && <p className="text-[11px] text-t3">Chargement…</p>}
          {requests.isError && (
            <p className="text-[11px] text-red">{requests.error.message}</p>
          )}
          {requests.data?.data.length === 0 && (
            <p className="text-[11px] text-t3">Aucune demande envoyée pour l’instant.</p>
          )}
          <ul className="space-y-1.5">
            {requests.data?.data.map((r) => (
              <li key={r.id} className="rounded-md border border-b1 bg-s1 p-2 text-[11px]">
                <p className="text-t1 break-words">{r.description}</p>
                <p className="text-t3">
                  {date(r.created_at)} · {r.resolved ? 'Traité' : 'En attente'}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <RequestMissingTextModal open={modalOpen} onOpenChange={setModalOpen} initialQuery={query} />
    </div>
  );
}

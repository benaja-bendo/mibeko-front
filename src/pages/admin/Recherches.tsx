import { useState } from 'react';
import AppLayout from '@/widgets/layout/AppLayout';
import { Button } from '@/shared/components/ui/Button';
import { HistoryPagination } from '@/features/billing/components/ManualBilling';
import { useNoResultSearchQueries, useTopSearchQueries } from '@/features/admin/hooks/useSearchLogs';

const date = (value: string) => new Date(value).toLocaleString('fr-FR');

/**
 * Requêtes fréquentes / sans résultat (mibeko-dashboard#111) : ce que le
 * marché demande réellement, et le trou d'ingestion à combler en priorité.
 */
export default function Recherches() {
  const [tab, setTab] = useState<'top' | 'no-results'>('no-results');
  const [page, setPage] = useState(1);
  const top = useTopSearchQueries(page, tab === 'top');
  const noResults = useNoResultSearchQueries(page, tab === 'no-results');
  const current = tab === 'top' ? top : noResults;

  return (
    <AppLayout space="admin">
      <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto w-full">
        <header className="space-y-2">
          <h1 className="text-2xl font-display text-t1">Recherches</h1>
          <p className="text-sm text-t3">
            Les requêtes sans résultat sont la feuille de route d’ingestion,
            classée par demande ; les requêtes fréquentes disent ce que le
            public cherche réellement.
          </p>
        </header>

        <div className="flex gap-2 flex-wrap" aria-label="Vues des recherches">
          <Button
            variant={tab === 'no-results' ? 'gold' : 'outline'}
            aria-pressed={tab === 'no-results'}
            onClick={() => { setTab('no-results'); setPage(1); }}
          >
            Sans résultat
          </Button>
          <Button
            variant={tab === 'top' ? 'gold' : 'outline'}
            aria-pressed={tab === 'top'}
            onClick={() => { setTab('top'); setPage(1); }}
          >
            Fréquentes
          </Button>
        </div>

        {current.isPending && <p role="status">Chargement…</p>}
        {current.isError && (
          <p role="alert">
            {current.error.message} <Button onClick={() => current.refetch()}>Réessayer la liste</Button>
          </p>
        )}
        {current.data && <p className="text-sm text-t3">{current.data.pagination.total} requête(s) distincte(s)</p>}
        {current.data?.data.length === 0 && (
          <p className="text-t2">
            {tab === 'no-results' ? 'Aucune recherche sans résultat sur cette fenêtre.' : 'Aucune recherche journalisée.'}
          </p>
        )}

        <ul className="space-y-2">
          {current.data?.data.map((row) => (
            <li key={row.query} className="bg-s1 border border-b1 rounded-xl p-4 flex justify-between gap-3 flex-wrap">
              <p className="text-sm text-t1 break-words">« {row.query} »</p>
              <p className="text-xs text-t3 whitespace-nowrap">
                {row.volume} recherche{row.volume > 1 ? 's' : ''} · dernière le {date(row.last_searched_at)}
              </p>
            </li>
          ))}
        </ul>

        {current.data && <HistoryPagination page={page} lastPage={current.data.pagination.last_page} onChange={setPage} />}
      </div>
    </AppLayout>
  );
}

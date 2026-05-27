/**
 * Catalogue.tsx — Catalogue complet des documents juridiques depuis le backend Laravel.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getCatalog } from '../services/laravelApi';
import AppLayout from '../components/layout/AppLayout';

const STATUS_CFG: Record<string, string> = {
  vigueur:    'text-green bg-green/10 border-green/20',
  abroge:     'text-red   bg-red/10   border-red/20',
  projet:     'text-amber bg-amber/10 border-amber/20',
};

function StatusBadge({ status }: { status?: string | null }) {
  const cls = STATUS_CFG[status || ''] || 'text-t3 bg-s2 border-b1';
  const labels: Record<string, string> = { vigueur: 'En vigueur', abroge: 'Abrogé', projet: 'Projet' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border ${cls}`}>
      {labels[status || ''] || status || '—'}
    </span>
  );
}

export default function Catalogue() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['laravel-catalog', page, search],
    queryFn: () => getCatalog({ page, per_page: perPage, search: search || undefined }),
    placeholderData: (prev) => prev,
  });

  const docs = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;
  const totalPages = pagination?.last_page || 1;

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-display font-semibold text-t1">Catalogue juridique</h1>
              <p className="text-t3 text-xs font-mono mt-0.5">
                {pagination?.total ? `${pagination.total} documents` : 'Chargement…'} — Mibeko Laravel
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 stroke-t3 fill-none stroke-[1.5]">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher un document juridique…"
              className="w-full h-9 bg-s2 border border-b1 rounded-md text-t1 pl-9 pr-3 text-sm font-body outline-none focus:border-gold/40 placeholder:text-t4 transition-colors"
            />
          </div>

          {/* Table */}
          <div className="bg-s1 border border-b1 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-b1">
                    <th className="text-left px-4 py-2.5 text-t3 font-mono uppercase tracking-widest font-normal">Titre</th>
                    <th className="text-left px-3 py-2.5 text-t3 font-mono uppercase tracking-widest font-normal">Type</th>
                    <th className="text-left px-3 py-2.5 text-t3 font-mono uppercase tracking-widest font-normal">Date pub.</th>
                    <th className="text-left px-3 py-2.5 text-t3 font-mono uppercase tracking-widest font-normal">Statut</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-b1">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-t3 font-mono">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 animate-spin stroke-current fill-none stroke-2 mx-auto">
                          <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
                          <path d="M12 3a9 9 0 0 1 9 9" />
                        </svg>
                      </td>
                    </tr>
                  ) : docs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-t3 font-mono">
                        Aucun document trouvé
                      </td>
                    </tr>
                  ) : docs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-s2 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="font-body text-t1 text-xs truncate max-w-xs group-hover:text-gold transition-colors">
                          {doc.titre_officiel}
                        </div>
                        {doc.reference_nor && (
                          <div className="text-t3 text-[10px] font-mono mt-0.5">{doc.reference_nor}</div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-t2 font-mono">{doc.type_code || doc.type?.code || '—'}</span>
                      </td>
                      <td className="px-3 py-3 text-t2 font-mono whitespace-nowrap">
                        {doc.date_publication || '—'}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={doc.statut} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          to={`/viewer/${doc.id}`}
                          className="inline-flex items-center gap-1 h-6 px-2.5 text-[11px] font-mono text-t2 bg-s2 border border-b1 rounded hover:bg-gold/10 hover:text-gold hover:border-gold/20 transition-all"
                        >
                          Ouvrir →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-b1">
                <span className="text-t3 text-[11px] font-mono">
                Page {page} / {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="h-7 px-3 text-xs font-mono text-t2 bg-s2 border border-b1 rounded hover:bg-s3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Précédent
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-7 px-3 text-xs font-mono text-t2 bg-s2 border border-b1 rounded hover:bg-s3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

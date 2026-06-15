/**
 * Dossiers.tsx — Espace "Gestion des dossiers".
 *
 * Pilotage des affaires en cours : vues tableau / kanban, création, suivi des
 * statuts, références juridiques, pièces, génération de documents et export PDF.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Plus, Search, LayoutGrid, Table2, FolderOpen } from 'lucide-react';
import AppLayout from '@/shared/components/layout/AppLayout';
import { useDossiers, useUpdateDossier } from '@/features/dossiers/hooks/useDossiers';
import type { DossierStatus } from '@/features/dossiers/types';
import DossierTable from '@/features/dossiers/components/DossierTable';
import DossierKanban from '@/features/dossiers/components/DossierKanban';
import DossierDrawer from '@/features/dossiers/components/DossierDrawer';
import NewDossierModal from '@/features/dossiers/components/NewDossierModal';

type ViewMode = 'table' | 'kanban';

export default function Dossiers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: dossiers = [], isLoading, isError } = useDossiers();
  const updateDossier = useUpdateDossier();

  const [view, setView] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const changeStatus = (id: string, status: DossierStatus) =>
    updateDossier.mutate({ id, patch: { status } });

  // Ouverture directe d'un dossier via ?open=<id>.
  useEffect(() => {
    const open = searchParams.get('open');
    if (open) {
      setActiveId(open);
      setDrawerOpen(true);
      searchParams.delete('open');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dossiers;
    return dossiers.filter((d) =>
      [d.title, d.client, d.adverse, d.reference]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [dossiers, search]);

  const openDossier = (id: string) => {
    setActiveId(id);
    setDrawerOpen(true);
  };

  return (
    <AppLayout space="app">
      <div className="flex h-full flex-col">
        {/* En-tête */}
        <header className="shrink-0 border-b border-b1 px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-semibold text-t1">
                Mes dossiers
              </h1>
              <p className="text-xs text-t3">
                {dossiers.length} affaire{dossiers.length > 1 ? 's' : ''} ·
                organisez clients, pièces et références
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Recherche */}
              <div className="relative hidden sm:block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t3" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="h-9 w-48 rounded-lg border border-b1 bg-s1 pl-8 pr-3 text-xs text-t1 placeholder:text-t3 focus:outline-none focus:ring-1 focus:ring-gold/40"
                />
              </div>

              {/* Bascule de vue */}
              <div className="flex items-center rounded-lg border border-b1 bg-s1 p-0.5">
                <button
                  type="button"
                  onClick={() => setView('table')}
                  title="Vue tableau"
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                    view === 'table'
                      ? 'bg-s3 text-t1'
                      : 'text-t3 hover:text-t1'
                  }`}
                >
                  <Table2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView('kanban')}
                  title="Vue kanban"
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                    view === 'kanban'
                      ? 'bg-s3 text-t1'
                      : 'text-t3 hover:text-t1'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="flex h-9 items-center gap-2 rounded-lg bg-gold px-3 text-sm font-semibold text-on-gold transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nouveau dossier</span>
              </button>
            </div>
          </div>
        </header>

        {/* Corps */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-t3">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : isError ? (
            <p className="py-16 text-center text-sm text-red">
              Impossible de charger vos dossiers. Réessayez plus tard.
            </p>
          ) : dossiers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10">
                <FolderOpen className="h-7 w-7 text-gold" />
              </div>
              <h2 className="font-display text-lg font-semibold text-t1">
                Aucun dossier
              </h2>
              <p className="mt-1.5 max-w-sm text-sm text-t3">
                Créez votre premier dossier pour regrouper vos références
                juridiques, pièces et documents.
              </p>
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="mt-5 flex h-9 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-on-gold transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Nouveau dossier
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-t3">
              Aucun dossier ne correspond à «&nbsp;{search}&nbsp;».
            </p>
          ) : view === 'table' ? (
            <DossierTable dossiers={filtered} onOpen={openDossier} />
          ) : (
            <DossierKanban
              dossiers={filtered}
              onOpen={openDossier}
              onStatusChange={changeStatus}
            />
          )}
        </div>
      </div>

      <NewDossierModal
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={openDossier}
      />
      <DossierDrawer
        dossierId={activeId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </AppLayout>
  );
}

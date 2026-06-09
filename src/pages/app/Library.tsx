/**
 * Library.tsx — Poste de travail "Bibliothèque Juridique".
 *
 * Interface double-panneau pensée pour un usage quotidien :
 *  - gauche : recherche (sémantique/précise), filtres serveur, résultats paginés ;
 *  - droite : lecture structurée du document sélectionné + actions rapides.
 *
 * Tous les filtres et la pagination sont appliqués côté serveur. Le périmètre
 * Congo/OHADA s'appuie sur le vrai champ `legal_scope` (plus d'heuristique).
 *
 * S'ouvre directement sur un document via `?doc=&article=` (citations Assistant)
 * et passe en mode « ajout au dossier » via `?addTo=<dossierId>`.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Library as LibraryIcon,
  SearchX,
  SlidersHorizontal,
  FolderInput,
  ArrowLeft,
  BookOpenText,
  Sparkles,
  Search,
} from 'lucide-react';
import AppLayout from '@/shared/components/layout/AppLayout';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/shared/components/ui/Resizable';
import { Sheet, SheetContent, SheetTitle } from '@/shared/components/ui/Sheet';
import { useIsDesktop } from '@/shared/hooks/useMediaQuery';
import { useLibrarySearch } from '@/features/library/hooks/useLibrary';
import LibrarySearchBar from '@/features/library/components/LibrarySearchBar';
import LibraryFilters from '@/features/library/components/LibraryFilters';
import LibraryResultItem from '@/features/library/components/LibraryResultItem';
import LibraryAiAnswer from '@/features/library/components/LibraryAiAnswer';
import LibraryPagination from '@/features/library/components/LibraryPagination';
import DocumentReader from '@/features/library/components/DocumentReader';
import DocumentReaderView from '@/features/library/components/DocumentReaderView';
import { useDossiersStore } from '@/features/dossiers/store/useDossiersStore';
import type {
  LibraryFilterState,
  SearchResultItem,
} from '@/features/library/types';

const PER_PAGE = 12;

const DEFAULT_FILTERS: LibraryFilterState = {
  mode: 'semantic',
  typeCode: null,
  legalScope: 'all',
  institutionId: null,
  dateFrom: null,
  dateTo: null,
  sort: 'relevance',
};

const EXAMPLE_QUERIES = [
  'rupture du contrat de travail',
  'article 45 code du travail',
  'constitution d\'une société (OHADA)',
  'droit de rétractation du consommateur',
];

/** Compte les filtres actifs (hors requête) pour le badge du bouton Filtres. */
function countActiveFilters(f: LibraryFilterState): number {
  return (
    (f.typeCode ? 1 : 0) +
    (f.legalScope !== 'all' ? 1 : 0) +
    (f.institutionId ? 1 : 0) +
    (f.dateFrom ? 1 : 0) +
    (f.dateTo ? 1 : 0) +
    (f.sort !== 'relevance' ? 1 : 0)
  );
}

export default function Library() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [searchParams] = useSearchParams();

  // Mode « ajout à un dossier » (depuis le drawer d'un dossier).
  const addToDossierId = searchParams.get('addTo');
  const targetDossier = useDossiersStore((s) =>
    addToDossierId ? s.dossiers.find((d) => d.id === addToDossierId) : undefined,
  );
  const addReference = useDossiersStore((s) => s.addReference);
  const addedIds = useMemo(
    () => new Set(targetDossier?.references.map((r) => r.id) ?? []),
    [targetDossier?.references],
  );

  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [filters, setFilters] = useState<LibraryFilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(isDesktop);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileReaderOpen, setMobileReaderOpen] = useState(false);

  // Document affiché dans le panneau de lecture.
  const [selected, setSelected] = useState<{
    documentId: string;
    articleId: string | null;
  } | null>(null);

  // Initialisation depuis l'URL (?q, ?doc, ?article).
  useEffect(() => {
    const q = searchParams.get('q');
    const doc = searchParams.get('doc');
    const article = searchParams.get('article');
    if (q) {
      setQuery(q);
      setSubmittedQuery(q);
    }
    if (doc) {
      setSelected({ documentId: doc, articleId: article });
      if (!isDesktop) setMobileReaderOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isFetching, isError } = useLibrarySearch({
    q: submittedQuery,
    type: filters.typeCode,
    legalScope: filters.legalScope,
    institutionId: filters.institutionId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sort: filters.sort,
    rag: filters.mode === 'semantic',
    page,
    perPage: PER_PAGE,
  });

  const results = data?.results ?? [];
  const pagination = data?.pagination ?? null;
  const hasSearched = submittedQuery.trim().length >= 2;
  const activeFilterCount = countActiveFilters(filters);

  const runSearch = (q: string) => {
    setSubmittedQuery(q.trim());
    setPage(1);
  };

  const handleSubmit = () => runSearch(query);

  // Modifier un filtre repart en page 1.
  const patchFilters = (patch: Partial<LibraryFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters((prev) => ({ ...DEFAULT_FILTERS, mode: prev.mode }));
    setPage(1);
  };

  const selectResult = (item: SearchResultItem) => {
    if (!item.document_id) return;
    setSelected({ documentId: item.document_id, articleId: item.id ?? null });
    if (!isDesktop) setMobileReaderOpen(true);
  };

  const handleAddToDossier = (item: SearchResultItem) => {
    if (!addToDossierId) return;
    addReference(addToDossierId, {
      id: item.id,
      type: 'article',
      title: item.document_title || 'Document',
      breadcrumb: item.breadcrumb ?? undefined,
      number: item.number ?? undefined,
    });
  };

  // ── Colonne de gauche (recherche + filtres + résultats) ────────────────────
  const leftColumn = (
    <div className="flex h-full flex-col">
      {/* Recherche + mode + bouton filtres */}
      <div className="shrink-0 space-y-2.5 border-b border-b1 p-3">
        <LibrarySearchBar
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          isLoading={isFetching && hasSearched}
        />

        <div className="flex items-center justify-between gap-2">
          {/* Mode de recherche */}
          <div className="flex items-center rounded-lg border border-b1 bg-s1 p-0.5">
            <button
              type="button"
              onClick={() => patchFilters({ mode: 'semantic' })}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filters.mode === 'semantic'
                  ? 'bg-gold/15 text-gold'
                  : 'text-t3 hover:text-t1'
              }`}
            >
              <Sparkles className="h-3 w-3" />
              Sémantique
            </button>
            <button
              type="button"
              onClick={() => patchFilters({ mode: 'precise' })}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filters.mode === 'precise'
                  ? 'bg-s3 text-t1'
                  : 'text-t3 hover:text-t1'
              }`}
            >
              <Search className="h-3 w-3" />
              Précise
            </button>
          </div>

          {/* Bouton filtres (inline desktop / Sheet mobile) */}
          <button
            type="button"
            onClick={() =>
              isDesktop
                ? setFiltersOpen((v) => !v)
                : setMobileFiltersOpen(true)
            }
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
              activeFilterCount > 0
                ? 'border-gold/30 bg-gold/10 text-gold'
                : 'border-b1 bg-s1 text-t2 hover:text-t1'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-[#120e00]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filtres inline (desktop, repliable) */}
      {isDesktop && filtersOpen && (
        <div className="max-h-[42%] shrink-0 overflow-y-auto border-b border-b1 bg-s1/30">
          <LibraryFilters
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
          />
        </div>
      )}

      {/* Résultats */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 p-3">
          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10">
                <LibraryIcon className="h-6 w-6 text-gold" />
              </div>
              <h2 className="font-display text-base font-semibold text-t1">
                Droit congolais & OHADA
              </h2>
              <p className="mt-1 max-w-xs text-xs text-t3">
                Recherchez par notion, numéro d'article ou question.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {EXAMPLE_QUERIES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setQuery(ex);
                      runSearch(ex);
                    }}
                    className="rounded-full border border-b1 bg-s1 px-2.5 py-1 text-[11px] text-t2 transition-colors hover:border-gold/30 hover:text-t1"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Synthèse IA (mode sémantique) */}
              {data?.answer && (
                <LibraryAiAnswer
                  answer={data.answer}
                  sourceCount={results.length}
                  query={submittedQuery}
                />
              )}

              {/* Compteur */}
              {!isError && (
                <p className="px-1 text-[11px] text-t3">
                  {isFetching
                    ? 'Recherche en cours…'
                    : pagination
                      ? `${pagination.total} résultat${pagination.total > 1 ? 's' : ''}`
                      : `${results.length} résultat${results.length > 1 ? 's' : ''}`}
                </p>
              )}

              {/* Skeletons */}
              {isFetching && results.length === 0 && (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-s1" />
                  ))}
                </div>
              )}

              {/* Erreur */}
              {isError && (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <SearchX className="h-7 w-7 text-red" />
                  <p className="text-sm text-t2">La recherche a échoué.</p>
                </div>
              )}

              {/* Aucun résultat */}
              {!isFetching && !isError && results.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <SearchX className="h-7 w-7 text-t3" />
                  <p className="text-sm text-t2">
                    Aucun texte pour «&nbsp;{submittedQuery}&nbsp;».
                  </p>
                  <p className="text-xs text-t3">
                    Reformulez ou élargissez les filtres.
                  </p>
                </div>
              )}

              {/* Liste */}
              {results.map((item) => (
                <LibraryResultItem
                  key={item.id}
                  item={item}
                  query={submittedQuery}
                  onOpen={selectResult}
                  active={selected?.documentId === item.document_id}
                  onAddToDossier={
                    addToDossierId ? handleAddToDossier : undefined
                  }
                  added={addedIds.has(item.id)}
                />
              ))}

              {/* Pagination réelle */}
              {pagination && (
                <LibraryPagination
                  pagination={pagination}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ── Panneau de lecture (droite, desktop) ───────────────────────────────────
  const previewPanel = selected ? (
    <DocumentReaderView
      documentId={selected.documentId}
      articleId={selected.articleId}
      onAddToDossier={
        addToDossierId
          ? () =>
              addReference(addToDossierId, {
                id: selected.documentId,
                type: 'document',
                title:
                  results.find((r) => r.document_id === selected.documentId)
                    ?.document_title || 'Document',
              })
          : undefined
      }
      addedToDossier={addedIds.has(selected.documentId)}
    />
  ) : (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-b1 bg-s1">
        <BookOpenText className="h-7 w-7 text-t3" />
      </div>
      <div>
        <p className="text-sm font-medium text-t2">Espace de lecture</p>
        <p className="mt-1 max-w-xs text-xs text-t3">
          Sélectionnez un texte dans les résultats pour le lire ici, avec sa
          structure et ses actions.
        </p>
      </div>
    </div>
  );

  return (
    <AppLayout space="app">
      <div className="flex h-full flex-col">
        {/* Bandeau « ajout à un dossier » */}
        {targetDossier && (
          <div className="flex items-center justify-between gap-3 border-b border-gold/20 bg-gold/[0.06] px-4 py-2">
            <span className="flex items-center gap-2 text-xs text-t2">
              <FolderInput className="h-4 w-4 text-gold" />
              Ajout de références au dossier&nbsp;
              <strong className="text-t1">{targetDossier.title}</strong>
            </span>
            <button
              type="button"
              onClick={() => navigate(`/app/dossiers?open=${targetDossier.id}`)}
              className="flex items-center gap-1.5 rounded-md border border-b1 bg-s1 px-2.5 py-1 text-[11px] font-medium text-t2 transition-colors hover:bg-s2 hover:text-t1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour au dossier
            </button>
          </div>
        )}

        {/* Double panneau (desktop) */}
        <div className="hidden min-h-0 flex-1 lg:flex">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={46} minSize={34}>
              {leftColumn}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={54} minSize={30}>
              {previewPanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Colonne unique (mobile / tablette) */}
        <div className="flex min-h-0 flex-1 flex-col lg:hidden">{leftColumn}</div>
      </div>

      {/* Lecteur en Sheet (mobile) */}
      {!isDesktop && (
        <DocumentReader
          documentId={selected?.documentId ?? null}
          articleId={selected?.articleId}
          open={mobileReaderOpen}
          onOpenChange={setMobileReaderOpen}
        />
      )}

      {/* Filtres en Sheet (mobile) */}
      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="left" className="w-[300px] overflow-y-auto p-0">
          <SheetTitle className="sr-only">Filtres de recherche</SheetTitle>
          <LibraryFilters
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
          />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

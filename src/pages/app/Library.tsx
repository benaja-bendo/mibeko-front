/**
 * Library.tsx — Poste de travail "Bibliothèque Juridique".
 *
 * Interface double-panneau pensée pour un usage quotidien :
 *  - gauche : recherche documentaire classique (full-text PostgreSQL), filtres
 *    serveur, résultats paginés triés par pertinence — sans aucune IA imposée ;
 *  - droite : surface adaptative qui affiche, selon l'action de l'utilisateur,
 *    soit la LECTURE d'un article/document, soit une réponse IA (explication
 *    d'un article ou synthèse d'une recherche), déclenchée volontairement.
 *
 * Avant toute recherche, la colonne gauche affiche un accueil vivant
 * (LibraryHomeView) : textes fondamentaux, derniers textes publiés, stats du
 * fonds et recherches récentes. Une visite guidée (GuidedTour) se lance à la
 * première visite et reste relançable via le bouton « ? ».
 *
 * L'état complet (requête, filtres, page, document lu) est synchronisé dans
 * l'URL : `?q=&type=&scope=&institution=&from=&to=&sort=&page=&doc=&article=`
 * — partageable, restauré au rechargement. `?addTo=<dossierId>` active le
 * mode « ajout au dossier ».
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  SearchX,
  SlidersHorizontal,
  FolderInput,
  ArrowLeft,
  BookOpenText,
  CircleHelp,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import AppLayout from '@/widgets/layout/AppLayout';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/shared/components/ui/Resizable';
import { Sheet, SheetContent, SheetTitle } from '@/shared/components/ui/Sheet';
import GuidedTour, { type TourStep } from '@/shared/components/tour/GuidedTour';
import { useTourState } from '@/shared/components/tour/useTourState';
import { useIsDesktop } from '@/shared/hooks/useMediaQuery';
import {
  useLibrarySearch,
  useLibraryAi,
} from '@/features/library/hooks/useLibrary';
import { useRecentSearches } from '@/features/library/hooks/useRecentSearches';
import LibrarySearchBar from '@/features/library/components/LibrarySearchBar';
import LibraryFilters from '@/features/library/components/LibraryFilters';
import LibraryHomeView from '@/features/library/components/LibraryHomeView';
import ThemeBrowseStrip from '@/features/library/components/ThemeBrowseStrip';
import ThemeResults from '@/features/library/components/ThemeResults';
import LibraryResultItem from '@/features/library/components/LibraryResultItem';
import LibraryPagination from '@/features/library/components/LibraryPagination';
import DocumentReaderView from '@/features/library/components/DocumentReaderView';
import LibraryAiPanel from '@/features/library/components/LibraryAiPanel';
import { useDossier } from '@/features/dossiers/hooks/useDossiers';
import { useDossierAnnexes } from '@/features/dossiers/store/useDossierAnnexes';
import type {
  LibraryFilterState,
  LibraryHomeDocument,
  SearchResultItem,
} from '@/features/library/types';

const PER_PAGE = 12;

const DEFAULT_FILTERS: LibraryFilterState = {
  typeCode: null,
  legalScope: 'all',
  institutionId: null,
  dateFrom: null,
  dateTo: null,
  sort: 'relevance',
  theme: null,
};

/** Étapes de la visite guidée. Les cibles absentes du DOM sont sautées. */
const LIBRARY_TOUR_STEPS: TourStep[] = [
  {
    target: 'search',
    title: 'Recherchez le droit',
    content:
      'Tapez une notion (« rupture du contrat de travail »), une référence précise (« article 45 code du travail ») ou une question en langage naturel. Le raccourci « / » ramène le curseur ici à tout moment.',
  },
  {
    target: 'filters',
    title: 'Affinez avec les filtres',
    content:
      'Périmètre (droit congolais, OHADA, communautaire), type de texte, institution émettrice, dates de publication et tri : tous appliqués côté serveur sur l\'ensemble du fonds.',
  },
  {
    target: 'home',
    title: 'Une bibliothèque vivante',
    content:
      'Sans rien taper, explorez les textes fondamentaux, les derniers textes publiés et vos recherches récentes. Un clic ouvre le document dans l\'espace de lecture.',
  },
  {
    target: 'synthesis',
    title: 'Synthèse Mibeko IA',
    content:
      'Après une recherche, demandez une synthèse des meilleurs résultats, sources citées à l\'appui. L\'IA n\'intervient que lorsque vous la sollicitez.',
    placement: 'bottom',
  },
  {
    target: 'reader',
    title: 'Espace de lecture',
    content:
      'Les textes s\'affichent ici : ouvrez un résultat pour lire l\'article dans son contexte, ou cliquez « Expliquer » pour une explication pédagogique par l\'IA.',
    placement: 'left',
  },
];

/** Compte les filtres actifs (hors requête) pour le badge du bouton Filtres. */
function countActiveFilters(f: LibraryFilterState): number {
  return (
    (f.typeCode ? 1 : 0) +
    (f.legalScope !== 'all' ? 1 : 0) +
    (f.institutionId ? 1 : 0) +
    (f.dateFrom ? 1 : 0) +
    (f.dateTo ? 1 : 0) +
    (f.sort !== 'relevance' ? 1 : 0) +
    (f.theme ? 1 : 0)
  );
}

/** Reconstruit l'état des filtres depuis les paramètres d'URL. */
function filtersFromParams(params: URLSearchParams): LibraryFilterState {
  const scope = params.get('scope');
  const sort = params.get('sort');
  return {
    typeCode: params.get('type'),
    legalScope:
      scope === 'national' || scope === 'ohada' || scope === 'communautaire'
        ? scope
        : 'all',
    institutionId: params.get('institution'),
    dateFrom: params.get('from'),
    dateTo: params.get('to'),
    sort: sort === 'date_desc' || sort === 'date_asc' ? sort : 'relevance',
    theme: params.get('theme'),
  };
}

export default function Library() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [searchParams, setSearchParams] = useSearchParams();

  // Mode « ajout à un dossier » (depuis le drawer d'un dossier).
  const addToDossierId = searchParams.get('addTo');
  const targetDossier = useDossier(addToDossierId);
  const { addReference } = useDossierAnnexes();
  const addedIds = useMemo(
    () => new Set(targetDossier?.references.map((r) => r.id) ?? []),
    [targetDossier?.references],
  );

  // État initialisé depuis l'URL (?q, type, scope, …, doc, article).
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [submittedQuery, setSubmittedQuery] = useState(
    () => searchParams.get('q') ?? '',
  );
  const [filters, setFilters] = useState<LibraryFilterState>(() =>
    filtersFromParams(searchParams),
  );
  const [page, setPage] = useState(() =>
    Math.max(1, Number(searchParams.get('page')) || 1),
  );

  // Fermés par défaut : la recherche d'abord, l'affinage ensuite.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  // Desktop : panneau droit (lecture/IA) déplié ou replié. Replié, les
  // résultats occupent toute la largeur ; un rail latéral permet de rouvrir
  // la dernière lecture sans la perdre.
  const [rightOpen, setRightOpen] = useState(true);

  // Document/article affiché dans le panneau de lecture.
  const [selected, setSelected] = useState<{
    documentId: string;
    articleId: string | null;
  } | null>(() => {
    const doc = searchParams.get('doc');
    return doc ? { documentId: doc, articleId: searchParams.get('article') } : null;
  });

  // Surface IA du panneau droit (explication / synthèse, en streaming).
  const ai = useLibraryAi();

  // Historique local des recherches (alimente l'accueil).
  const { recentSearches, addRecentSearch, clearRecentSearches } =
    useRecentSearches();

  // Visite guidée : auto-démarrage à la première visite, relançable via « ? ».
  const tour = useTourState('library');

  // Arrivée via citation (?doc=…) sur mobile : ouvre le panneau de lecture.
  useEffect(() => {
    if (selected && !isDesktop) setMobileRightOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // L'URL reflète l'état complet : partageable et restaurée au rechargement.
  useEffect(() => {
    const params = new URLSearchParams();
    const q = submittedQuery.trim();
    if (q.length >= 2) params.set('q', q);
    if (filters.typeCode) params.set('type', filters.typeCode);
    if (filters.legalScope !== 'all') params.set('scope', filters.legalScope);
    if (filters.institutionId) params.set('institution', filters.institutionId);
    if (filters.dateFrom) params.set('from', filters.dateFrom);
    if (filters.dateTo) params.set('to', filters.dateTo);
    if (filters.sort !== 'relevance') params.set('sort', filters.sort);
    if (filters.theme) params.set('theme', filters.theme);
    if (page > 1) params.set('page', String(page));
    if (selected) {
      params.set('doc', selected.documentId);
      if (selected.articleId) params.set('article', selected.articleId);
    }
    if (addToDossierId) params.set('addTo', addToDossierId);
    setSearchParams(params, { replace: true });
  }, [submittedQuery, filters, page, selected, addToDossierId, setSearchParams]);

  const { data, isFetching, isError } = useLibrarySearch({
    q: submittedQuery,
    type: filters.typeCode,
    legalScope: filters.legalScope,
    institutionId: filters.institutionId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sort: filters.sort,
    tag: filters.theme,
    page,
    perPage: PER_PAGE,
  });

  const results = data?.results ?? [];
  const pagination = data?.pagination ?? null;
  // Trois modes exclusifs : recherche d'articles (texte), parcours par thème
  // (liste de documents), ou accueil. Le thème seul NE lance PAS la recherche
  // full-text (qui exige une requête texte).
  const isSearch = submittedQuery.trim().length >= 2;
  const isThemeBrowse = !isSearch && !!filters.theme;
  const hasSearched = isSearch;
  const activeFilterCount = countActiveFilters(filters);

  const runSearch = (q: string) => {
    const trimmed = q.trim();
    setQuery(trimmed);
    setSubmittedQuery(trimmed);
    setPage(1);
    addRecentSearch(trimmed);
  };

  const handleSubmit = () => runSearch(query);

  // Modifier un filtre repart en page 1.
  const patchFilters = (patch: Partial<LibraryFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  // ── Actions du panneau droit ───────────────────────────────────────────────

  /** Ouvre/déplie le panneau droit (desktop : déplié ; mobile : Sheet). */
  const openRightPanel = () => {
    if (isDesktop) setRightOpen(true);
    else setMobileRightOpen(true);
  };

  /** Replie le panneau droit. La sélection est conservée pour réouverture. */
  const closeRightPanel = () => {
    if (isDesktop) setRightOpen(false);
    else setMobileRightOpen(false);
  };

  /** Lire un article : bascule la surface droite en mode lecture. */
  const selectResult = (item: SearchResultItem) => {
    if (!item.document_id) return;
    setSelected({ documentId: item.document_id, articleId: item.id ?? null });
    ai.close(); // la lecture prend la priorité sur une éventuelle réponse IA
    openRightPanel();
  };

  /** Ouvre un document depuis l'accueil (textes fondamentaux / récents). */
  const openHomeDocument = (doc: LibraryHomeDocument) => {
    setSelected({ documentId: doc.id, articleId: null });
    ai.close();
    openRightPanel();
  };

  /** Ouvre une suggestion d'autocomplétion dans l'espace de lecture. */
  const openSuggestion = (documentId: string, articleId: string | null) => {
    setSelected({ documentId, articleId });
    ai.close();
    openRightPanel();
  };

  /** Expliquer un article via l'IA (et garder l'article comme lecture de repli). */
  const explainResult = (item: SearchResultItem) => {
    if (item.document_id) {
      setSelected({ documentId: item.document_id, articleId: item.id ?? null });
    }
    ai.start({
      kind: 'explain',
      articleId: item.id,
      documentTitle: item.document_title || 'Document',
      articleNumber: item.number,
    });
    openRightPanel();
  };

  /** Synthèse Mibeko IA du top-K de la recherche courante. */
  const runSynthesis = () => {
    if (!hasSearched) return;
    ai.start({ kind: 'synthesis', q: submittedQuery, filters });
    openRightPanel();
  };

  /** Explication déclenchée depuis le lecteur (article en cours de lecture). */
  const explainFromReader = (payload: {
    articleId: string;
    documentTitle: string;
    articleNumber?: string | null;
  }) => {
    ai.start({ kind: 'explain', ...payload });
    openRightPanel();
  };

  /** Ferme la surface IA (le lecteur reprend la main s'il y en a un). */
  const closeAi = () => {
    ai.close();
    // Plus rien à lire en dessous : on replie complètement le panneau droit.
    if (!selected) closeRightPanel();
  };

  /** Ouvre une source de la réponse IA dans le lecteur. */
  const openSourceInReader = (item: SearchResultItem) => {
    if (!item.document_id) return;
    setSelected({ documentId: item.document_id, articleId: item.id ?? null });
    ai.close();
    openRightPanel();
  };

  const retryAi = () => {
    if (ai.request) ai.start(ai.request);
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

  // ── Colonne de gauche (recherche + filtres + accueil/résultats) ────────────
  const leftColumn = (
    <div className="flex h-full flex-col">
      {/* Recherche + boutons filtres / aide */}
      <div className="shrink-0 space-y-2.5 border-b border-b1 p-3">
        <div data-tour="search">
          <LibrarySearchBar
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            onClear={() => {
              setSubmittedQuery('');
              setPage(1);
            }}
            onOpenSuggestion={openSuggestion}
            isLoading={isFetching && hasSearched}
          />
        </div>

        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={tour.start}
            title="Revoir la visite guidée"
            aria-label="Revoir la visite guidée"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-b1 bg-s1 text-t3 transition-colors hover:text-gold"
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            data-tour="filters"
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
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-on-gold">
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

      {/* Accueil vivant ou résultats */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 p-3">
          {isThemeBrowse ? (
            <ThemeResults
              slug={filters.theme as string}
              onOpenDocument={openHomeDocument}
              onClear={() => patchFilters({ theme: null })}
            />
          ) : !isSearch ? (
            <div data-tour="home">
              <ThemeBrowseStrip onSelect={(slug) => patchFilters({ theme: slug })} />
              <LibraryHomeView
                onSearch={runSearch}
                onOpenDocument={openHomeDocument}
                recentSearches={recentSearches}
                onClearRecentSearches={clearRecentSearches}
              />
            </div>
          ) : (
            <>
              {/* En-tête résultats : compteur + Synthèse IA volontaire */}
              {!isError && (
                <div className="flex items-center justify-between gap-2 px-1">
                  <p className="text-[11px] text-t3">
                    {isFetching
                      ? 'Recherche en cours…'
                      : pagination
                        ? `${pagination.total} résultat${pagination.total > 1 ? 's' : ''}`
                        : `${results.length} résultat${results.length > 1 ? 's' : ''}`}
                  </p>

                  {results.length > 0 && (
                    <button
                      type="button"
                      data-tour="synthesis"
                      onClick={runSynthesis}
                      className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold transition-colors hover:bg-gold/15"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Synthèse Mibeko IA
                    </button>
                  )}
                </div>
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
                  onExplain={explainResult}
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

  // ── Surface droite : IA (priorité) > lecture > vide ────────────────────────
  const rightSurface = ai.active ? (
    <LibraryAiPanel
      state={ai}
      onClose={closeAi}
      onOpenSource={openSourceInReader}
      onRetry={retryAi}
      closeOnEscape={isDesktop}
    />
  ) : selected ? (
    <DocumentReaderView
      documentId={selected.documentId}
      articleId={selected.articleId}
      onExplainArticle={explainFromReader}
      // Desktop : bouton X + Échap. Mobile : la fermeture passe par le Sheet.
      onClose={isDesktop ? closeRightPanel : undefined}
      closeOnEscape={isDesktop}
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
          Sélectionnez un texte pour le lire ici, ou demandez une explication IA
          depuis un résultat.
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

        {/* Desktop : double panneau (déplié) ou résultats pleine largeur +
            rail de réouverture (replié). */}
        <div className="hidden min-h-0 flex-1 lg:flex">
          {rightOpen ? (
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={46} minSize={34}>
                {leftColumn}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={54} minSize={30}>
                <div className="h-full" data-tour="reader">
                  {rightSurface}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <>
              <div className="min-w-0 flex-1" data-tour="reader">
                {leftColumn}
              </div>
              {(selected || ai.active) && (
                <button
                  type="button"
                  onClick={openRightPanel}
                  title="Rouvrir le panneau de lecture"
                  aria-label="Rouvrir le panneau de lecture"
                  className="flex w-10 shrink-0 flex-col items-center justify-center gap-2 border-l border-b1 bg-s1 text-t3 transition-colors hover:bg-s2 hover:text-gold"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="rotate-180 text-[11px] font-medium tracking-wide [writing-mode:vertical-rl]">
                    {ai.active ? 'Réponse IA' : 'Lecture'}
                  </span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Colonne unique (mobile / tablette) */}
        <div className="flex min-h-0 flex-1 flex-col lg:hidden">{leftColumn}</div>
      </div>

      {/* Surface droite en Sheet (mobile) : lecture ou IA */}
      {!isDesktop && (
        <Sheet open={mobileRightOpen} onOpenChange={setMobileRightOpen}>
          <SheetContent
            side="right"
            className="flex w-full flex-col p-0 sm:max-w-none md:w-[88vw]"
          >
            <SheetTitle className="sr-only">Panneau de lecture</SheetTitle>
            {rightSurface}
          </SheetContent>
        </Sheet>
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

      {/* Visite guidée de la page */}
      <GuidedTour
        steps={LIBRARY_TOUR_STEPS}
        open={tour.open}
        onClose={tour.close}
      />
    </AppLayout>
  );
}

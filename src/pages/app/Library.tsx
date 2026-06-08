/**
 * Library.tsx — Espace "Bibliothèque Juridique".
 *
 * Recherche sémantique (vectorielle + plein-texte) sur la base Mibeko, filtres
 * latéraux, synthèse IA optionnelle (RAG) et lecture approfondie des textes.
 *
 * Sait s'ouvrir directement sur un document (paramètres d'URL `doc` / `article`),
 * notamment depuis les citations cliquables de l'Assistant.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Library as LibraryIcon, SearchX, FolderInput, ArrowLeft } from 'lucide-react';
import AppLayout from '@/shared/components/layout/AppLayout';
import { useLibrarySearch } from '@/features/library/hooks/useLibrary';
import LibrarySearchBar from '@/features/library/components/LibrarySearchBar';
import LibraryFilters from '@/features/library/components/LibraryFilters';
import LibraryResultItem from '@/features/library/components/LibraryResultItem';
import LibraryAiAnswer from '@/features/library/components/LibraryAiAnswer';
import DocumentReader from '@/features/library/components/DocumentReader';
import { useDossiersStore } from '@/features/dossiers/store/useDossiersStore';
import type {
  LibraryFilterState,
  SearchResultItem,
} from '@/features/library/types';

const EXAMPLE_QUERIES = [
  'rupture du contrat de travail',
  'article 45 code du travail',
  'constitution d\'une société (OHADA)',
  'droit de rétractation du consommateur',
];

/** Filtre client par périmètre juridique (le modèle n'a pas de champ pays). */
function matchesScope(item: SearchResultItem, scope: string): boolean {
  if (scope === 'all') return true;
  const haystack = `${item.breadcrumb ?? ''} ${item.document_title ?? ''}`.toLowerCase();
  const isOhada = haystack.includes('ohada') || haystack.includes('uniforme');
  return scope === 'ohada' ? isOhada : !isOhada;
}

export default function Library() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Mode "ajout à un dossier" : déclenché depuis le drawer d'un dossier.
  const addToDossierId = searchParams.get('addTo');
  const targetDossier = useDossiersStore((s) =>
    addToDossierId ? s.dossiers.find((d) => d.id === addToDossierId) : undefined,
  );
  const addReference = useDossiersStore((s) => s.addReference);
  const addedIds = useMemo(
    () => new Set(targetDossier?.references.map((r) => r.id) ?? []),
    [targetDossier?.references],
  );

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

  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [filters, setFilters] = useState<LibraryFilterState>({
    typeCode: null,
    scope: 'all',
    rag: true,
  });

  // Lecteur de document.
  const [reader, setReader] = useState<{
    documentId: string | null;
    articleId: string | null;
    open: boolean;
  }>({ documentId: null, articleId: null, open: false });

  // Initialisation depuis l'URL (?q, ?doc, ?article) — citations de l'Assistant.
  useEffect(() => {
    const q = searchParams.get('q');
    const doc = searchParams.get('doc');
    const article = searchParams.get('article');

    if (q) {
      setQuery(q);
      setSubmittedQuery(q);
    }
    if (doc) {
      setReader({ documentId: doc, articleId: article, open: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isFetching, isError } = useLibrarySearch({
    q: submittedQuery,
    type: filters.typeCode,
    rag: filters.rag,
  });

  // Application du filtre client "périmètre".
  const results = useMemo(
    () => (data?.results ?? []).filter((r) => matchesScope(r, filters.scope)),
    [data?.results, filters.scope],
  );

  const patchFilters = (patch: Partial<LibraryFilterState>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const handleSubmit = () => setSubmittedQuery(query.trim());

  const openReader = (item: SearchResultItem) =>
    setReader({
      documentId: item.document_id ?? null,
      articleId: item.id ?? null,
      open: true,
    });

  const handleReaderOpenChange = (open: boolean) => {
    setReader((prev) => ({ ...prev, open }));
    // Nettoie l'URL quand on referme le lecteur ouvert via citation.
    if (!open && (searchParams.has('doc') || searchParams.has('article'))) {
      searchParams.delete('doc');
      searchParams.delete('article');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const hasSearched = submittedQuery.trim().length >= 2;

  return (
    <AppLayout space="app">
      <div className="flex h-full flex-col">
        {/* En-tête + recherche */}
        <header className="shrink-0 border-b border-b1 px-4 py-4 md:px-6">
          <div className="mx-auto max-w-5xl">
            <h1 className="mb-3 font-display text-xl font-semibold text-t1">
              Bibliothèque juridique
            </h1>
            <LibrarySearchBar
              value={query}
              onChange={setQuery}
              onSubmit={handleSubmit}
              isLoading={isFetching && hasSearched}
            />

            {/* Bandeau "ajout à un dossier" */}
            {targetDossier && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gold/20 bg-gold/[0.06] px-3 py-2">
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
          </div>
        </header>

        {/* Corps : filtres + résultats */}
        <div className="flex min-h-0 flex-1">
          {/* Filtres latéraux */}
          <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-b1 bg-s1/40 md:block">
            <LibraryFilters filters={filters} onChange={patchFilters} />
          </aside>

          {/* Résultats */}
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
              {/* État initial */}
              {!hasSearched && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10">
                    <LibraryIcon className="h-7 w-7 text-gold" />
                  </div>
                  <h2 className="font-display text-lg font-semibold text-t1">
                    Explorez le droit congolais et OHADA
                  </h2>
                  <p className="mt-1.5 max-w-md text-sm text-t3">
                    Recherchez par notion, numéro d'article ou question en langage
                    naturel.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {EXAMPLE_QUERIES.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => {
                          setQuery(ex);
                          setSubmittedQuery(ex);
                        }}
                        className="rounded-full border border-b1 bg-s1 px-3 py-1.5 text-xs text-t2 transition-colors hover:border-gold/30 hover:text-t1"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Résultats */}
              {hasSearched && (
                <div className="space-y-4">
                  {/* Synthèse IA (RAG) */}
                  {data?.answer && (
                    <LibraryAiAnswer
                      answer={data.answer}
                      sourceCount={results.length}
                      query={submittedQuery}
                    />
                  )}

                  {/* Compteur */}
                  {!isError && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-t3">
                        {isFetching
                          ? 'Recherche en cours…'
                          : `${results.length} résultat${results.length > 1 ? 's' : ''}`}
                      </p>
                    </div>
                  )}

                  {/* Skeletons */}
                  {isFetching && results.length === 0 && (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="h-28 animate-pulse rounded-xl bg-s1"
                        />
                      ))}
                    </div>
                  )}

                  {/* Erreur */}
                  {isError && (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                      <SearchX className="h-7 w-7 text-red" />
                      <p className="text-sm text-t2">
                        La recherche a échoué. Réessayez dans un instant.
                      </p>
                    </div>
                  )}

                  {/* Aucun résultat */}
                  {!isFetching && !isError && results.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                      <SearchX className="h-7 w-7 text-t3" />
                      <p className="text-sm text-t2">
                        Aucun texte trouvé pour «&nbsp;{submittedQuery}&nbsp;».
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
                      onOpen={openReader}
                      onAddToDossier={
                        addToDossierId ? handleAddToDossier : undefined
                      }
                      added={addedIds.has(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Lecteur de document */}
      <DocumentReader
        documentId={reader.documentId}
        articleId={reader.articleId}
        open={reader.open}
        onOpenChange={handleReaderOpenChange}
      />
    </AppLayout>
  );
}

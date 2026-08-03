/**
 * LibrarySearchBar.tsx — Barre de recherche de la Bibliothèque, avec
 * autocomplétion temps réel.
 *
 * L'utilisateur ne doit jamais se demander « que puis-je taper ici ? » :
 * dès deux caractères, un panneau montre tout ce qui correspond dans le
 * fonds, groupé par nature :
 *  - Textes    : titres de documents (codes, lois, constitution…) ;
 *  - Articles  : ciblage par numéro (« article 49 », « 49 code du travail ») ;
 *  - Passages  : extraits du CONTENU même des lois, correspondance surlignée.
 * Chaque suggestion ouvre directement le texte dans l'espace de lecture ;
 * Entrée (ou « Rechercher ») lance la recherche complète classique.
 *
 * Raccourci "/" pour focaliser. Navigation ↑/↓ + Entrée, Échap pour fermer.
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Loader2,
  X,
  ScrollText,
  FileText,
  Quote,
  CornerDownLeft,
} from 'lucide-react';
import { useLibrarySuggestions } from '@/features/library/hooks/useLibrary';
import { displayArticleNumber } from '@/shared/lib/legalLabels';
import type {
  SuggestArticle,
  SuggestDocument,
  SuggestPassage,
} from '@/features/library/types';

interface LibrarySearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** Effacement complet : vide aussi la recherche soumise (retour accueil). */
  onClear?: () => void;
  /** Ouvre une suggestion dans l'espace de lecture (document ± article). */
  onOpenSuggestion?: (documentId: string, articleId: string | null) => void;
  isLoading?: boolean;
}

/** Élément navigable du panneau (suggestions aplaties + action finale). */
type SuggestionItem =
  | { kind: 'document'; data: SuggestDocument }
  | { kind: 'article'; data: SuggestArticle }
  | { kind: 'passage'; data: SuggestPassage }
  | { kind: 'search-all' };

/** Rend un extrait balisé [[…]] en nœuds React (jamais de HTML injecté). */
function SnippetText({ snippet }: { snippet: string }) {
  const parts = snippet.split(/\[\[(.*?)\]\]/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-gold/20 px-0.5 text-gold">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function GroupLabel({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 px-3 pb-1 pt-2.5 font-mono text-[10px] uppercase tracking-widest text-t4">
      <Icon className="h-3 w-3" />
      {children}
    </p>
  );
}

export default function LibrarySearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  onOpenSuggestion,
  isLoading,
}: LibrarySearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Suggestions uniquement pendant la saisie active (debounce dans le hook).
  const { data: suggestions, isFetching } = useLibrarySuggestions(
    focused ? value : '',
  );

  // Raccourci clavier "/" pour focaliser la recherche (hors champ de saisie).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fermeture au clic en dehors du bloc recherche + panneau.
  useEffect(() => {
    if (!focused) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [focused]);

  // Liste navigable : suggestions aplaties + « rechercher partout » en pied.
  const items = useMemo<SuggestionItem[]>(() => {
    if (!suggestions) return [];
    return [
      ...suggestions.documents.map(
        (data): SuggestionItem => ({ kind: 'document', data }),
      ),
      ...suggestions.articles.map(
        (data): SuggestionItem => ({ kind: 'article', data }),
      ),
      ...suggestions.passages.map(
        (data): SuggestionItem => ({ kind: 'passage', data }),
      ),
      { kind: 'search-all' },
    ];
  }, [suggestions]);

  // La sélection clavier repart du début quand les suggestions changent.
  useEffect(() => setActiveIndex(-1), [items]);

  const hasMatches = items.length > 1;
  const open = focused && value.trim().length >= 2 && (hasMatches || isFetching);

  const activate = (item: SuggestionItem) => {
    setFocused(false);
    if (item.kind === 'search-all') {
      onSubmit();
      return;
    }
    if (!onOpenSuggestion) return;
    if (item.kind === 'document') {
      onOpenSuggestion(item.data.id, null);
    } else {
      onOpenSuggestion(item.data.document_id, item.data.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
      return;
    }
    if (open && e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
      return;
    }
    if (e.key === 'Escape') {
      setFocused(false);
      return;
    }
    if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && items[activeIndex]) {
        activate(items[activeIndex]);
      } else {
        setFocused(false);
        onSubmit();
      }
    }
  };

  /** Classe d'un item selon l'état de la sélection clavier. */
  const itemClass = (index: number) =>
    `flex w-full items-start gap-2 px-3 py-1.5 text-left transition-colors ${
      index === activeIndex ? 'bg-s2' : 'hover:bg-s2'
    }`;

  // Index globaux par groupe (la liste aplatie pilote la navigation clavier).
  const documentCount = suggestions?.documents.length ?? 0;
  const articleCount = suggestions?.articles.length ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-t3" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          // La frappe rouvre le panneau (même après Échap ou une sélection).
          setFocused(true);
          onChange(e.target.value);
        }}
        onFocus={() => setFocused(true)}
        // Recliquer un input déjà focalisé ne déclenche pas onFocus : on
        // rouvre explicitement le panneau au clic.
        onClick={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder="Titre d'un texte, n° d'article, notion ou extrait du contenu…"
        className="h-11 w-full rounded-xl border border-b1 bg-s1 pl-11 pr-24 text-sm text-t1 placeholder:text-t3 transition-colors focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
      />

      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {isLoading ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin text-gold" />
        ) : value ? (
          <button
            type="button"
            onClick={() => {
              onChange('');
              onClear?.();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-t3 hover:bg-s2 hover:text-t1"
            title="Effacer"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="mr-1 hidden rounded border border-b1 bg-s2 px-1.5 py-0.5 font-mono text-[10px] text-t3 sm:inline">
            /
          </kbd>
        )}
        <button
          type="button"
          onClick={() => {
            setFocused(false);
            onSubmit();
          }}
          className="flex h-7 items-center rounded-lg bg-gold px-3 text-xs font-semibold text-on-gold transition-opacity hover:opacity-90"
        >
          Rechercher
        </button>
      </div>

      {/* Panneau d'autocomplétion */}
      {open && (
        <div
          role="listbox"
          // preventDefault : un mousedown dans le panneau ne doit pas faire
          // perdre le focus à l'input (sinon le panneau se ferme avant le clic).
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-[420px] overflow-y-auto rounded-xl border border-b1 bg-bg pb-1 shadow-lg"
        >
          {suggestions && suggestions.documents.length > 0 && (
            <section>
              <GroupLabel icon={ScrollText}>Textes</GroupLabel>
              {suggestions.documents.map((doc, i) => (
                <button
                  key={doc.id}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === i}
                  onClick={() => activate({ kind: 'document', data: doc })}
                  className={itemClass(i)}
                >
                  <ScrollText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-t1">
                      {doc.title}
                    </span>
                    {doc.type_name && (
                      <span className="block text-[10px] text-t3">
                        {doc.type_name}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </section>
          )}

          {suggestions && suggestions.articles.length > 0 && (
            <section>
              <GroupLabel icon={FileText}>Articles</GroupLabel>
              {suggestions.articles.map((article, i) => {
                const index = documentCount + i;
                return (
                  <button
                    key={article.id}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    onClick={() => activate({ kind: 'article', data: article })}
                    className={itemClass(index)}
                  >
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-t1">
                        Article {displayArticleNumber(article.number)} — {article.document_title}
                      </span>
                    </span>
                  </button>
                );
              })}
            </section>
          )}

          {suggestions && suggestions.passages.length > 0 && (
            <section>
              <GroupLabel icon={Quote}>Dans le texte des lois</GroupLabel>
              {suggestions.passages.map((passage, i) => {
                const index = documentCount + articleCount + i;
                return (
                  <button
                    key={passage.id}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    onClick={() => activate({ kind: 'passage', data: passage })}
                    className={itemClass(index)}
                  >
                    <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] text-t3">
                        Art. {displayArticleNumber(passage.number)} · {passage.document_title}
                      </span>
                      <span className="line-clamp-2 text-xs leading-snug text-t2">
                        <SnippetText snippet={passage.snippet} />
                      </span>
                    </span>
                  </button>
                );
              })}
            </section>
          )}

          {/* Action finale : recherche complète sur tout le fonds */}
          <button
            type="button"
            role="option"
            aria-selected={activeIndex === items.length - 1}
            onClick={() => activate({ kind: 'search-all' })}
            className={`${itemClass(items.length - 1)} mt-1 border-t border-b1 pt-2`}
          >
            <CornerDownLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-t3" />
            <span className="text-xs text-t2">
              Rechercher «&nbsp;
              <span className="font-medium text-t1">{value.trim()}</span>
              &nbsp;» dans tout le fonds
            </span>
          </button>

          {isFetching && !hasMatches && (
            <p className="flex items-center gap-2 px-3 py-2 text-xs text-t3">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
              Recherche de suggestions…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

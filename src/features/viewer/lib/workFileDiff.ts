import type {
  WorkFileArticle,
  WorkFileNode,
  WorkFileSnapshot,
  WorkFileTarget,
} from '@/features/documents/api/laravelApi';

/**
 * Comparaison locale entre l'état courant du document et la proposition
 * déposée. Le serveur reste l'autorité sur ce qui sera écrit — il renvoie ses
 * propres compteurs et refuse ce qu'il doit refuser. Ce module ne sert qu'à
 * MONTRER le détail que le serveur ne transporte pas : quel texte change, de
 * quel numéro à quel numéro, de quelle page à quelle page.
 *
 * L'appariement reproduit exactement celui du serveur : par `id` quand la cible
 * en fournit un, par numéro sinon. Un `id` fourni mais inconnu ne se replie pas
 * sur le numéro — dans ce cas le serveur crée un article neuf et retire
 * l'ancien, et l'écran doit le dire ainsi.
 */

export type DiffStatus = 'ajoute' | 'retire' | 'modifie' | 'inchange';

export interface ArticleDiff {
  status: DiffStatus;
  number: string;
  previousNumber: string | null;
  contentChanged: boolean;
  locatorChanged: boolean;
  charactersBefore: number;
  charactersAfter: number;
  contentBefore: string | null;
  contentAfter: string | null;
  pageBefore: number | null;
  pageAfter: number | null;
}

export interface NodeDiff {
  status: DiffStatus;
  type: string;
  number: string | null;
  titleBefore: string | null;
  titleAfter: string | null;
}

export interface WorkFileDiff {
  articles: ArticleDiff[];
  nodes: NodeDiff[];
  removedArticles: number;
  addedArticles: number;
  renumberedArticles: number;
  contentChanges: number;
  locatorChanges: number;
  charactersBefore: number;
  charactersAfter: number;
}

const pageOf = (article: Pick<WorkFileArticle, 'source_locator'>): number | null => {
  const page = (article.source_locator as { page?: unknown } | undefined)?.page;

  return typeof page === 'number' ? page : null;
};

/** Égalité de repère indépendante de l'ordre des clés, comme la canonicalisation serveur. */
const sameLocator = (a: WorkFileArticle, b: WorkFileArticle): boolean =>
  JSON.stringify(sortedEntries(a.source_locator)) === JSON.stringify(sortedEntries(b.source_locator));

const sortedEntries = (value: unknown): [string, unknown][] =>
  value && typeof value === 'object'
    ? Object.entries(value as Record<string, unknown>).sort(([x], [y]) => x.localeCompare(y))
    : [];

export function buildWorkFileDiff(current: WorkFileTarget, proposed: WorkFileTarget): WorkFileDiff {
  const currentById = new Map(current.articles.filter((a) => a.id).map((a) => [a.id as string, a]));
  const currentByNumber = new Map(current.articles.map((a) => [a.number, a]));

  const matched = new Set<WorkFileArticle>();
  const articles: ArticleDiff[] = [];

  for (const article of proposed.articles) {
    const existing = article.id ? currentById.get(article.id) : currentByNumber.get(article.number);

    if (!existing) {
      articles.push({
        status: 'ajoute',
        number: article.number,
        previousNumber: null,
        contentChanged: true,
        locatorChanged: true,
        charactersBefore: 0,
        charactersAfter: article.content.length,
        contentBefore: null,
        contentAfter: article.content,
        pageBefore: null,
        pageAfter: pageOf(article),
      });
      continue;
    }

    matched.add(existing);
    const contentChanged = existing.content !== article.content;
    const locatorChanged = !sameLocator(existing, article);
    const renumbered = existing.number !== article.number;

    articles.push({
      status: contentChanged || locatorChanged || renumbered ? 'modifie' : 'inchange',
      number: article.number,
      previousNumber: renumbered ? existing.number : null,
      contentChanged,
      locatorChanged,
      charactersBefore: existing.content.length,
      charactersAfter: article.content.length,
      contentBefore: existing.content,
      contentAfter: article.content,
      pageBefore: pageOf(existing),
      pageAfter: pageOf(article),
    });
  }

  for (const existing of current.articles) {
    if (matched.has(existing)) continue;

    articles.push({
      status: 'retire',
      number: existing.number,
      previousNumber: null,
      contentChanged: false,
      locatorChanged: false,
      charactersBefore: existing.content.length,
      charactersAfter: 0,
      contentBefore: existing.content,
      contentAfter: null,
      pageBefore: pageOf(existing),
      pageAfter: null,
    });
  }

  return {
    articles,
    nodes: buildNodeDiff(current.nodes, proposed.nodes),
    removedArticles: articles.filter((a) => a.status === 'retire').length,
    addedArticles: articles.filter((a) => a.status === 'ajoute').length,
    renumberedArticles: articles.filter((a) => a.previousNumber !== null).length,
    contentChanges: articles.filter((a) => a.status === 'modifie' && a.contentChanged).length,
    locatorChanges: articles.filter((a) => a.status === 'modifie' && a.locatorChanged).length,
    charactersBefore: current.articles.reduce((total, a) => total + a.content.length, 0),
    charactersAfter: proposed.articles.reduce((total, a) => total + a.content.length, 0),
  };
}

function buildNodeDiff(current: WorkFileNode[], proposed: WorkFileNode[]): NodeDiff[] {
  const currentById = new Map(current.filter((n) => n.id).map((n) => [n.id as string, n]));
  const reused = new Set<string>();
  const diffs: NodeDiff[] = [];

  for (const node of proposed) {
    const existing = node.id ? currentById.get(node.id) : undefined;

    if (!existing) {
      diffs.push({
        status: 'ajoute',
        type: node.type,
        number: node.number,
        titleBefore: null,
        titleAfter: node.title,
      });
      continue;
    }

    reused.add(existing.id as string);
    const changed =
      existing.title !== node.title || existing.number !== node.number || existing.type !== node.type;

    diffs.push({
      status: changed ? 'modifie' : 'inchange',
      type: node.type,
      number: node.number,
      titleBefore: existing.title,
      titleAfter: node.title,
    });
  }

  for (const existing of current) {
    if (existing.id && reused.has(existing.id)) continue;

    diffs.push({
      status: 'retire',
      type: existing.type,
      number: existing.number,
      titleBefore: existing.title,
      titleAfter: null,
    });
  }

  return diffs;
}

/**
 * Contrôles faits avant tout appel réseau : ils rendent un message lisible là
 * où le serveur renverrait un 422 ou un 409 difficile à interpréter. Ils ne
 * remplacent pas les siens — c'est lui qui décide.
 */
export function validateWorkFile(snapshot: WorkFileSnapshot, parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') {
    return 'Ce fichier ne contient pas d’objet JSON.';
  }

  const candidate = parsed as Partial<WorkFileTarget> & { target?: WorkFileTarget };
  const target = candidate.target ?? (candidate as WorkFileTarget);

  if (!target || typeof target !== 'object' || !Array.isArray(target.articles)) {
    return 'Ce fichier ne ressemble pas à un dossier de travail : aucune liste d’articles.';
  }

  if (target.schema_version !== 1) {
    return `Version de format inattendue (${String(target.schema_version)}). Ce dossier attend la version 1.`;
  }

  if (target.document_id !== snapshot.target.document_id) {
    return 'Ce dossier de travail appartient à un autre document.';
  }

  if (
    (target.source_pdf?.sha256 ?? '').toLowerCase() !== snapshot.target.source_pdf.sha256.toLowerCase()
  ) {
    return 'Le PDF de référence du fichier ne correspond pas au PDF source du document.';
  }

  if (target.articles.length === 0) {
    return 'Le fichier ne contient aucun article : rien à appliquer.';
  }

  return null;
}

/** Le fichier peut être le snapshot complet ou la seule cible. */
export function extractTarget(parsed: unknown): WorkFileTarget {
  const candidate = parsed as Partial<WorkFileTarget> & { target?: WorkFileTarget };

  return candidate.target ?? (candidate as WorkFileTarget);
}

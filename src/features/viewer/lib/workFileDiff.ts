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
  parentChanged: boolean;
  orderChanged: boolean;
  charactersBefore: number;
  charactersAfter: number;
  contentBefore: string | null;
  contentAfter: string | null;
  pageBefore: number | null;
  pageAfter: number | null;
  parentBefore: string | null;
  parentAfter: string | null;
  orderBefore: number | null;
  orderAfter: number | null;
}

export interface NodeDiff {
  status: DiffStatus;
  type: string;
  number: string | null;
  titleBefore: string | null;
  titleAfter: string | null;
  parentChanged: boolean;
  orderChanged: boolean;
  parentBefore: string | null;
  parentAfter: string | null;
  orderBefore: number | null;
  orderAfter: number | null;
}

export interface WorkFileDiff {
  articles: ArticleDiff[];
  nodes: NodeDiff[];
  removedArticles: number;
  addedArticles: number;
  renumberedArticles: number;
  contentChanges: number;
  locatorChanges: number;
  articleStructureChanges: number;
  nodeStructureChanges: number;
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

const nodeIdentityByKey = (nodes: WorkFileNode[]): Map<string, string> =>
  new Map(nodes.map((node) => [node.key, node.id ?? `key:${node.key}`]));

const parentIdentity = (parent: string | null, identities: Map<string, string>): string | null =>
  parent === null ? null : (identities.get(parent) ?? `key:${parent}`);

export function buildWorkFileDiff(current: WorkFileTarget, proposed: WorkFileTarget): WorkFileDiff {
  const currentById = new Map(current.articles.filter((a) => a.id).map((a) => [a.id as string, a]));
  const currentByNumber = new Map(current.articles.map((a) => [a.number, a]));
  const currentNodeIdentities = nodeIdentityByKey(current.nodes);
  const proposedNodeIdentities = nodeIdentityByKey(proposed.nodes);

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
        parentChanged: article.parent !== null,
        orderChanged: true,
        charactersBefore: 0,
        charactersAfter: article.content.length,
        contentBefore: null,
        contentAfter: article.content,
        pageBefore: null,
        pageAfter: pageOf(article),
        parentBefore: null,
        parentAfter: article.parent,
        orderBefore: null,
        orderAfter: article.order,
      });
      continue;
    }

    matched.add(existing);
    const contentChanged = existing.content !== article.content;
    const locatorChanged = !sameLocator(existing, article);
    const renumbered = existing.number !== article.number;
    const parentChanged = parentIdentity(existing.parent, currentNodeIdentities)
      !== parentIdentity(article.parent, proposedNodeIdentities);
    const orderChanged = existing.order !== article.order;

    articles.push({
      status: contentChanged || locatorChanged || renumbered || parentChanged || orderChanged
        ? 'modifie'
        : 'inchange',
      number: article.number,
      previousNumber: renumbered ? existing.number : null,
      contentChanged,
      locatorChanged,
      parentChanged,
      orderChanged,
      charactersBefore: existing.content.length,
      charactersAfter: article.content.length,
      contentBefore: existing.content,
      contentAfter: article.content,
      pageBefore: pageOf(existing),
      pageAfter: pageOf(article),
      parentBefore: existing.parent,
      parentAfter: article.parent,
      orderBefore: existing.order,
      orderAfter: article.order,
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
      parentChanged: existing.parent !== null,
      orderChanged: true,
      charactersBefore: existing.content.length,
      charactersAfter: 0,
      contentBefore: existing.content,
      contentAfter: null,
      pageBefore: pageOf(existing),
      pageAfter: null,
      parentBefore: existing.parent,
      parentAfter: null,
      orderBefore: existing.order,
      orderAfter: null,
    });
  }

  const nodes = buildNodeDiff(current.nodes, proposed.nodes);

  return {
    articles,
    nodes,
    removedArticles: articles.filter((a) => a.status === 'retire').length,
    addedArticles: articles.filter((a) => a.status === 'ajoute').length,
    renumberedArticles: articles.filter((a) => a.previousNumber !== null).length,
    contentChanges: articles.filter((a) => a.status === 'modifie' && a.contentChanged).length,
    locatorChanges: articles.filter((a) => a.status === 'modifie' && a.locatorChanged).length,
    articleStructureChanges: articles.filter(
      (a) => a.status === 'modifie' && (a.parentChanged || a.orderChanged),
    ).length,
    nodeStructureChanges: nodes.filter(
      (node) => node.status === 'modifie' && (node.parentChanged || node.orderChanged),
    ).length,
    charactersBefore: current.articles.reduce((total, a) => total + a.content.length, 0),
    charactersAfter: proposed.articles.reduce((total, a) => total + a.content.length, 0),
  };
}

function buildNodeDiff(current: WorkFileNode[], proposed: WorkFileNode[]): NodeDiff[] {
  const currentById = new Map(current.filter((n) => n.id).map((n) => [n.id as string, n]));
  const currentIdentities = nodeIdentityByKey(current);
  const proposedIdentities = nodeIdentityByKey(proposed);
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
        parentChanged: node.parent !== null,
        orderChanged: true,
        parentBefore: null,
        parentAfter: node.parent,
        orderBefore: null,
        orderAfter: node.order,
      });
      continue;
    }

    reused.add(existing.id as string);
    const parentChanged = parentIdentity(existing.parent, currentIdentities)
      !== parentIdentity(node.parent, proposedIdentities);
    const orderChanged = existing.order !== node.order;
    const changed =
      existing.title !== node.title
      || existing.number !== node.number
      || existing.type !== node.type
      || parentChanged
      || orderChanged;

    diffs.push({
      status: changed ? 'modifie' : 'inchange',
      type: node.type,
      number: node.number,
      titleBefore: existing.title,
      titleAfter: node.title,
      parentChanged,
      orderChanged,
      parentBefore: existing.parent,
      parentAfter: node.parent,
      orderBefore: existing.order,
      orderAfter: node.order,
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
      parentChanged: existing.parent !== null,
      orderChanged: true,
      parentBefore: existing.parent,
      parentAfter: null,
      orderBefore: existing.order,
      orderAfter: null,
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

  const candidate = parsed as Partial<WorkFileSnapshot>;
  const target = candidate.target;

  if (!target || typeof target !== 'object' || !Array.isArray(target.articles)) {
    return 'Ce fichier doit être le dossier de travail complet exporté par Mibeko.';
  }

  if (
    typeof candidate.expected_fingerprint !== 'string'
    || !/^[a-f0-9]{64}$/i.test(candidate.expected_fingerprint)
  ) {
    return 'L’empreinte d’origine du dossier de travail est absente ou invalide.';
  }

  if (!Array.isArray(target.nodes)) {
    return 'Ce fichier ne porte pas de liste de divisions : structure illisible.';
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

/** La validation impose l'enveloppe complète, porteuse de l'empreinte d'origine. */
export function extractTarget(parsed: unknown): WorkFileTarget {
  const candidate = parsed as Partial<WorkFileSnapshot>;

  return candidate.target as WorkFileTarget;
}

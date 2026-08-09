/**
 * Tableaux d'un article juridique — modèle canonique et segmentation du contenu.
 *
 * Invariant du corpus (`docs/decisions.md`, 09/08/2026) : `contenu_texte` ne
 * contient jamais de balisage. Un tableau y est **linéarisé** (une ligne par
 * rangée, cellules séparées par « | ») et sa forme structurée voyage à côté,
 * dans `source_locator.tables`, avec les bornes de lignes qu'il occupe. Une
 * surface qui ignore cette structure affiche donc un texte lisible ; celle qui
 * la lit remplace ces lignes par un vrai tableau.
 *
 * Deux chemins, dans cet ordre de confiance :
 *   1. `tables` fourni par l'API → segmentation par bornes de lignes ;
 *   2. repli hérité : du HTML MinerU (`<table>…`) encore présent dans le texte
 *      d'articles ingérés avant la normalisation. Ce chemin disparaîtra une
 *      fois le corpus rétro-corrigé — il n'est là que pour ne pas laisser des
 *      balises à l'écran en attendant.
 *
 * Jumeau : `mibeko-site/src/lib/tables.ts`, dépôt qui n'a pas de suite de tests
 * — les cas sont donc couverts ici (`tables.test.ts`), et une correction faite
 * d'un côté doit être reportée de l'autre. Troisième implémentation côté
 * mobile, en Kotlin (`mibeko-app-kmp`).
 */

/** Tableau sous forme canonique : en-têtes optionnels + rangées de cellules. */
export interface LegalTable {
  /** Intitulé du tableau (ligne qui le précède dans le texte source). */
  caption: string | null;
  /** Cellules de la ligne d'en-tête. Vide si le tableau n'en a pas. */
  headers: string[];
  /** Rangées de données, hors en-tête. */
  rows: string[][];
}

/** Tableau tel que servi par l'API publique (bornes de lignes en plus). */
export interface ApiTable extends LegalTable {
  line_start: number | null;
  line_end: number | null;
}

/** Morceau de contenu à rendre : du texte, ou un tableau. */
export type ContentSegment =
  | { kind: 'text'; text: string }
  | { kind: 'table'; table: LegalTable };

/** Entités HTML rencontrées dans les cellules produites par MinerU. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  laquo: '«',
  raquo: '»',
  deg: '°',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
};

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith('#')) {
      const code = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Texte d'une cellule : balises internes retirées, entités décodées, espaces normalisés. */
function cellText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * Portée horizontale d'une cellule (`colspan`).
 *
 * Au-delà de 32, l'attribut est du bruit OCR et non une intention de mise en
 * forme : la cellule compte pour une plutôt que de gonfler la rangée de
 * milliers de cellules vides. Même borne côté pipeline
 * (`mibeko-python/src/extractor/tables.py`), qui lui en fait une anomalie.
 */
function colspanOf(attributes: string): number {
  const match = /colspan\s*=\s*["']?(\d+)/i.exec(attributes);
  const value = match ? Number.parseInt(match[1], 10) : 1;
  return Number.isFinite(value) && value > 1 && value <= 32 ? value : 1;
}

const TABLE_PATTERN = /<table\b[^>]*>([\s\S]*?)<\/table\s*>/gi;
const ROW_PATTERN = /<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi;
const CELL_PATTERN = /<(t[dh])\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;

/**
 * Une rangée est-elle une ligne d'en-tête ?
 *
 * MinerU n'émet pas de `<th>` : il faut deviner. Critère volontairement étroit —
 * chaque cellule non vide doit contenir au moins une lettre. Une rangée de
 * données commence presque toujours par un identifiant numérique (« 3-2-1 ») ou
 * un montant, ce qui la disqualifie. Le pire cas est cosmétique (une rangée
 * affichée en gras) ; la structuration amont, elle, tranche pour de bon.
 */
function looksLikeHeaderRow(cells: string[]): boolean {
  const filled = cells.filter((cell) => cell !== '');
  return filled.length > 0 && filled.every((cell) => /\p{L}/u.test(cell));
}

/** Parse un fragment `<table>…</table>` en rangées de texte brut. */
function parseTableRows(inner: string): string[][] {
  const rows: string[][] = [];
  ROW_PATTERN.lastIndex = 0;

  for (let row = ROW_PATTERN.exec(inner); row !== null; row = ROW_PATTERN.exec(inner)) {
    const cells: string[] = [];
    CELL_PATTERN.lastIndex = 0;

    for (let cell = CELL_PATTERN.exec(row[1]); cell !== null; cell = CELL_PATTERN.exec(row[1])) {
      const text = cellText(cell[3]);
      // `colspan` est aplati en cellules vides pour préserver l'alignement des
      // colonnes. `rowspan` n'est pas propagé : la structuration amont le
      // signale (`tableau_suspect`) plutôt que de deviner à l'affichage.
      cells.push(text);
      for (let extra = colspanOf(cell[2]); extra > 1; extra -= 1) {
        cells.push('');
      }
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  return rows;
}

function textSegment(text: string): ContentSegment[] {
  return text.trim() === '' ? [] : [{ kind: 'text', text }];
}

/**
 * Segmente le contenu d'un article à partir des tableaux structurés de l'API.
 *
 * Les bornes sont des indices de lignes de `content` (début inclus, fin exclue),
 * comme posé par le pipeline. Une borne absente ou incohérente fait retomber le
 * tableau en fin de contenu plutôt que de tronquer le texte : mieux vaut un
 * tableau mal placé qu'un texte officiel amputé.
 */
export function segmentsFromApiTables(content: string, tables: ApiTable[]): ContentSegment[] {
  const lines = content.split('\n');
  const anchored = tables
    .filter((table) => table.line_start !== null && table.line_end !== null
      && table.line_start >= 0 && table.line_end > table.line_start)
    .sort((a, b) => (a.line_start ?? 0) - (b.line_start ?? 0));

  const segments: ContentSegment[] = [];
  let cursor = 0;

  for (const table of anchored) {
    const start = Math.min(table.line_start!, lines.length);
    const end = Math.min(table.line_end!, lines.length);
    if (start < cursor) {
      continue; // Chevauchement : on garde le premier, on ignore le second.
    }
    segments.push(...textSegment(lines.slice(cursor, start).join('\n')));
    segments.push({ kind: 'table', table });
    cursor = end;
  }

  segments.push(...textSegment(lines.slice(cursor).join('\n')));

  // Tableaux sans ancrage exploitable : rendus à la suite, jamais perdus.
  for (const table of tables) {
    if (!anchored.includes(table)) {
      segments.push({ kind: 'table', table });
    }
  }

  return segments;
}

/**
 * Segmente un contenu hérité contenant du HTML MinerU brut.
 *
 * Repli transitoire : voir l'en-tête du module. Le texte hors tableaux est
 * conservé tel quel (cas des actes dont un article porte une phrase
 * d'introduction suivie d'un tableau de coordonnées).
 */
export function segmentsFromHtml(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let cursor = 0;
  TABLE_PATTERN.lastIndex = 0;

  for (let match = TABLE_PATTERN.exec(content); match !== null; match = TABLE_PATTERN.exec(content)) {
    segments.push(...textSegment(content.slice(cursor, match.index)));

    const rows = parseTableRows(match[1]);
    if (rows.length === 0) {
      // Balise `<table>` sans rangée exploitable : on ne perd rien, on rend le
      // fragment tel quel plutôt que de l'escamoter silencieusement.
      segments.push(...textSegment(match[0]));
    } else {
      const hasHeader = rows.length > 1 && looksLikeHeaderRow(rows[0]);
      segments.push({
        kind: 'table',
        table: {
          caption: null,
          headers: hasHeader ? rows[0] : [],
          rows: hasHeader ? rows.slice(1) : rows,
        },
      });
    }

    cursor = match.index + match[0].length;
  }

  segments.push(...textSegment(content.slice(cursor)));

  return segments;
}

/**
 * Segmente le contenu d'un article pour l'affichage.
 *
 * Point d'entrée unique des surfaces de lecture : elles n'ont pas à savoir si
 * le corpus a déjà été normalisé ou non.
 */
export function articleSegments(
  content: string | null | undefined,
  tables?: ApiTable[] | null,
): ContentSegment[] {
  if (content == null || content === '') {
    return [];
  }
  if (tables && tables.length > 0) {
    return segmentsFromApiTables(content, tables);
  }
  if (/<table\b/i.test(content)) {
    return segmentsFromHtml(content);
  }
  return textSegment(content);
}

/** Vrai si le contenu porte encore du balisage de tableau non normalisé. */
export function hasRawTableMarkup(content: string | null | undefined): boolean {
  return content != null && /<table\b/i.test(content);
}

/**
 * Rendu textuel d'un tableau : une ligne par rangée, cellules séparées par « | ».
 *
 * C'est la forme que le pipeline écrit dans `contenu_texte`, et celle qu'on
 * réutilise partout où seul du texte peut passer (description SEO, JSON-LD,
 * presse-papier, export). Elle doit rester identique à la linéarisation amont
 * (`mibeko-python/src/extractor/tables.py`).
 */
export function linearizeTable(table: LegalTable): string {
  const lines = [
    ...(table.caption ? [table.caption] : []),
    ...(table.headers.length > 0 ? [table.headers] : []),
    ...table.rows,
  ].map((line) => (Array.isArray(line) ? line.join(' | ') : line));

  return lines.join('\n');
}

/** Contenu d'un article ramené à du texte pur (tableaux linéarisés). */
export function articlePlainText(
  content: string | null | undefined,
  tables?: ApiTable[] | null,
): string {
  return articleSegments(content, tables)
    .map((segment) => (segment.kind === 'text' ? segment.text : linearizeTable(segment.table)))
    .join('\n')
    .trim();
}

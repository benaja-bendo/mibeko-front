import { describe, it, expect } from 'vitest';
import {
  articlePlainText,
  articleSegments,
  hasRawTableMarkup,
  linearizeTable,
  segmentsFromApiTables,
  segmentsFromHtml,
  type ApiTable,
} from './tables';

/**
 * Ces cas font foi pour les trois implémentations du parseur (ce fichier,
 * `mibeko-site/src/lib/tables.ts`, et le jumeau Kotlin de `mibeko-app-kmp`).
 * Les extraits de HTML viennent du corpus réel : décret budgétaire de 1959 et
 * arrêtés miniers de 2026, tels que produits par MinerU.
 */
const BUDGET_HTML =
  '<table><tr><td>Chapitres et articles</td><td>NOMENCLATURE</td><td>Crédits primitifs</td></tr>' +
  '<tr><td>3-2-1</td><td>Assemblée législative (personnel)</td><td>37.000.000</td></tr>' +
  '<tr><td>3-4-1</td><td>Ministères (personnel)</td><td>55.805.000</td></tr></table>';

describe('segmentsFromHtml', () => {
  it('reconstruit un tableau et reconnaît sa ligne d\'en-tête', () => {
    const segments = segmentsFromHtml(BUDGET_HTML);

    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe('table');
    if (segments[0].kind !== 'table') return;
    expect(segments[0].table.headers).toEqual([
      'Chapitres et articles',
      'NOMENCLATURE',
      'Crédits primitifs',
    ]);
    expect(segments[0].table.rows).toEqual([
      ['3-2-1', 'Assemblée législative (personnel)', '37.000.000'],
      ['3-4-1', 'Ministères (personnel)', '55.805.000'],
    ]);
  });

  it('conserve le texte qui encadre le tableau', () => {
    const segments = segmentsFromHtml(
      `La zone est définie par les limites suivantes :\n${BUDGET_HTML}\nFait à Brazzaville.`,
    );

    expect(segments.map((s) => s.kind)).toEqual(['text', 'table', 'text']);
    expect(segments[0]).toMatchObject({ text: expect.stringContaining('limites suivantes') });
    expect(segments[2]).toMatchObject({ text: expect.stringContaining('Fait à Brazzaville') });
  });

  it('décode les entités HTML des cellules', () => {
    const segments = segmentsFromHtml(
      '<table><tr><td>Sommets</td><td>Longitudes</td></tr>' +
        '<tr><td>A</td><td>11° 22&#x27;22, 40&#x27; E</td></tr>' +
        '<tr><td>B</td><td>03° 39&quot;7 &amp; 20 S</td></tr></table>',
    );

    if (segments[0].kind !== 'table') throw new Error('tableau attendu');
    expect(segments[0].table.rows).toEqual([
      ['A', "11° 22'22, 40' E"],
      ['B', '03° 39"7 & 20 S'],
    ]);
  });

  it('aplatit colspan en cellules vides pour garder les colonnes alignées', () => {
    const segments = segmentsFromHtml(
      '<table><tr><td>A</td><td>B</td><td>C</td></tr><tr><td colspan="2">Total</td><td>9</td></tr></table>',
    );

    if (segments[0].kind !== 'table') throw new Error('tableau attendu');
    expect(segments[0].table.rows).toEqual([['Total', '', '9']]);
  });

  it('compte un colspan aberrant pour une seule cellule', () => {
    // Au-delà de 32 c'est du bruit OCR : gonfler la rangée de milliers de
    // cellules vides serait pire que le mal. Le pipeline, lui, en fait une
    // anomalie (`tableau_colspan_aberrant`).
    const segments = segmentsFromHtml('<table><tr><td colspan="9999">X</td></tr></table>');

    if (segments[0].kind !== 'table') throw new Error('tableau attendu');
    expect(segments[0].table.rows).toEqual([['X']]);
  });

  it('traite <th> comme une cellule et garde la première rangée en en-tête', () => {
    const segments = segmentsFromHtml(
      '<table><tr><th>Sommet</th><th>Latitude</th></tr><tr><td>A</td><td>03° 39</td></tr></table>',
    );

    if (segments[0].kind !== 'table') throw new Error('tableau attendu');
    expect(segments[0].table.headers).toEqual(['Sommet', 'Latitude']);
    expect(segments[0].table.rows).toEqual([['A', '03° 39']]);
  });

  it('ne promeut pas en en-tête une première rangée purement numérique', () => {
    const segments = segmentsFromHtml(
      '<table><tr><td>3-2-1</td><td>37.000.000</td></tr><tr><td>3-4-1</td><td>55.805.000</td></tr></table>',
    );

    if (segments[0].kind !== 'table') throw new Error('tableau attendu');
    expect(segments[0].table.headers).toEqual([]);
    expect(segments[0].table.rows).toHaveLength(2);
  });

  it('ne promeut pas en en-tête la seule rangée d\'un tableau', () => {
    const segments = segmentsFromHtml('<table><tr><td>Sommets</td><td>Longitudes</td></tr></table>');

    if (segments[0].kind !== 'table') throw new Error('tableau attendu');
    expect(segments[0].table.headers).toEqual([]);
    expect(segments[0].table.rows).toEqual([['Sommets', 'Longitudes']]);
  });

  it('ne perd rien d\'un balisage tronqué : le texte officiel prime', () => {
    const orphan = '<table><tr><td>Rangée sans fermeture';
    expect(articlePlainText(orphan)).toContain('Rangée sans fermeture');

    const empty = 'Avant <table></table> après';
    expect(articlePlainText(empty)).toContain('Avant');
    expect(articlePlainText(empty)).toContain('après');
  });

  it('gère plusieurs tableaux dans un même article', () => {
    const segments = segmentsFromHtml(`${BUDGET_HTML}Intercalaire${BUDGET_HTML}`);

    expect(segments.map((s) => s.kind)).toEqual(['table', 'text', 'table']);
  });
});

describe('segmentsFromApiTables', () => {
  const table: ApiTable = {
    caption: 'Crédits ouverts',
    headers: ['Chapitre', 'Montant'],
    rows: [['3-2-1', '50.000.000']],
    line_start: 1,
    line_end: 3,
  };

  it('remplace les lignes ancrées par le tableau et garde le texte autour', () => {
    const content = 'Introduction.\nChapitre | Montant\n3-2-1 | 50.000.000\nFait à Brazzaville.';
    const segments = segmentsFromApiTables(content, [table]);

    expect(segments.map((s) => s.kind)).toEqual(['text', 'table', 'text']);
    expect(segments[0]).toMatchObject({ text: 'Introduction.' });
    expect(segments[2]).toMatchObject({ text: 'Fait à Brazzaville.' });
  });

  it('rend en fin de contenu un tableau sans ancrage exploitable', () => {
    const segments = segmentsFromApiTables('Texte seul.', [
      { ...table, line_start: null, line_end: null },
    ]);

    expect(segments.map((s) => s.kind)).toEqual(['text', 'table']);
  });

  it('ignore le second de deux ancrages qui se chevauchent', () => {
    const content = 'a\nb\nc\nd';
    const segments = segmentsFromApiTables(content, [
      { ...table, line_start: 0, line_end: 3 },
      { ...table, line_start: 1, line_end: 2 },
    ]);

    expect(segments.filter((s) => s.kind === 'table')).toHaveLength(1);
  });

  it('n\'ampute pas le texte quand les bornes dépassent le contenu', () => {
    const segments = segmentsFromApiTables('une seule ligne', [
      { ...table, line_start: 0, line_end: 99 },
    ]);

    expect(segments.map((s) => s.kind)).toEqual(['table']);
  });
});

describe('articleSegments', () => {
  it('préfère la structure de l\'API au balisage résiduel du texte', () => {
    const segments = articleSegments(BUDGET_HTML, [
      { caption: null, headers: ['A'], rows: [['1']], line_start: null, line_end: null },
    ]);

    if (segments.at(-1)?.kind !== 'table') throw new Error('tableau attendu');
    expect(segments.filter((s) => s.kind === 'table')).toHaveLength(1);
  });

  it('rend le texte ordinaire tel quel, sauts de ligne compris', () => {
    expect(articleSegments('Article premier.\nLe présent décret…')).toEqual([
      { kind: 'text', text: 'Article premier.\nLe présent décret…' },
    ]);
  });

  it('ne produit aucun segment pour un contenu vide', () => {
    expect(articleSegments(null)).toEqual([]);
    expect(articleSegments('')).toEqual([]);
  });
});

describe('linearizeTable et articlePlainText', () => {
  it('linéarise un tableau en une ligne par rangée', () => {
    expect(
      linearizeTable({
        caption: 'Crédits ouverts',
        headers: ['Chapitre', 'Montant'],
        rows: [['3-2-1', '50.000.000']],
      }),
    ).toBe('Crédits ouverts\nChapitre | Montant\n3-2-1 | 50.000.000');
  });

  it('ne laisse jamais sortir de balise : c\'est l\'invariant du corpus', () => {
    const plain = articlePlainText(`Introduction :\n${BUDGET_HTML}`);

    expect(plain).not.toMatch(/<\/?(table|tr|td|th)\b/i);
    expect(plain).not.toContain('&#x27;');
    expect(plain).toContain('Chapitres et articles | NOMENCLATURE | Crédits primitifs');
    expect(plain).toContain('Introduction :');
  });
});

describe('hasRawTableMarkup', () => {
  it('repère le balisage hérité, et lui seul', () => {
    expect(hasRawTableMarkup(BUDGET_HTML)).toBe(true);
    expect(hasRawTableMarkup('Texte ordinaire, article 5.')).toBe(false);
    expect(hasRawTableMarkup(null)).toBe(false);
  });
});

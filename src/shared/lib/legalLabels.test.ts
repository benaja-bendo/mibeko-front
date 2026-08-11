import { describe, it, expect } from 'vitest';
import { articleLeafLabel, displayArticleNumber } from './legalLabels';

describe('displayArticleNumber', () => {
  it('retire le suffixe technique _doublon_N', () => {
    expect(displayArticleNumber('2_doublon_1')).toBe('2');
    expect(displayArticleNumber('49_doublon_2')).toBe('49');
  });

  it('laisse un numéro sans collision inchangé', () => {
    expect(displayArticleNumber('1er')).toBe('1er');
    expect(displayArticleNumber('PREAMBULE')).toBe('PREAMBULE');
    expect(displayArticleNumber('3 bis')).toBe('3 bis');
  });

  it('tolère null/undefined', () => {
    expect(displayArticleNumber(null)).toBe('');
    expect(displayArticleNumber(undefined)).toBe('');
  });
});

describe('articleLeafLabel', () => {
  it('retire le suffixe _doublon_N avant de construire le libellé', () => {
    expect(articleLeafLabel('2_doublon_1')).toBe('Article 2');
    expect(articleLeafLabel('2_doublon_1', { short: true })).toBe('Art. 2');
  });

  it('rend un vrai article', () => {
    expect(articleLeafLabel('1er')).toBe('Article 1er');
    expect(articleLeafLabel('12')).toBe('Article 12');
  });

  it('rend la forme courte (table des matières)', () => {
    expect(articleLeafLabel('1er', { short: true })).toBe('Art. 1er');
  });

  it('libelle le préambule sans « Article »', () => {
    expect(articleLeafLabel('PREAMBULE')).toBe('Préambule');
    expect(articleLeafLabel('PREAMBULE', { short: true })).toBe('Préambule');
  });

  it('libelle la signature sans « Article »', () => {
    expect(articleLeafLabel('SIGNATURE')).toBe('Signature');
    expect(articleLeafLabel('SIGNATURE', { short: true })).toBe('Signature');
  });

  it('libelle les tableaux', () => {
    expect(articleLeafLabel('TABLEAU_1')).toBe('Tableau 1');
    expect(articleLeafLabel('TABLEAU_2', { short: true })).toBe('Tab. 2');
  });

  it('libelle les dispositions sans faux numéro d’article', () => {
    expect(articleLeafLabel('DISPOSITION_1')).toBe('Disposition 1');
    expect(articleLeafLabel('DISPOSITION_2', { short: true })).toBe('Disp. 2');
  });

  it('libelle les notes', () => {
    expect(articleLeafLabel('NOTE_1')).toBe('Note 1');
    expect(articleLeafLabel('NOTE_2', { short: true })).toBe('Note 2');
  });

  it('tolère null/undefined', () => {
    expect(articleLeafLabel(null)).toBe('Article ');
    expect(articleLeafLabel(undefined, { short: true })).toBe('Art. ');
  });
});

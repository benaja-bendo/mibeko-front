import { describe, it, expect } from 'vitest';
import { articleLeafLabel } from './legalLabels';

describe('articleLeafLabel', () => {
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

  it('tolère null/undefined', () => {
    expect(articleLeafLabel(null)).toBe('Article ');
    expect(articleLeafLabel(undefined, { short: true })).toBe('Art. ');
  });
});

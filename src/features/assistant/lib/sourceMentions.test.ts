import { describe, expect, it } from 'vitest';
import { buildMentionMatcher } from './sourceMentions';
import type { AssistantSource } from '@/features/assistant/types';

const sources: AssistantSource[] = [
  { id: 'a1', number: '42', document_title: 'Code du travail' },
  { id: 'a2', number: '7', document_title: 'Acte uniforme OHADA' },
];

describe('buildMentionMatcher', () => {
  it('renvoie null sans sources', () => {
    expect(buildMentionMatcher(undefined)).toBeNull();
    expect(buildMentionMatcher([])).toBeNull();
  });

  it('repère un titre de document cité (insensible à la casse)', () => {
    const matcher = buildMentionMatcher(sources)!;
    const matches = matcher.findMatches('Selon le code du travail, le préavis…');

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ index: 1, text: 'code du travail' });
    expect(matches[0].source.id).toBe('a1');
  });

  it('relie « article N » à la source dont le numéro est unique', () => {
    const matcher = buildMentionMatcher(sources)!;

    expect(matcher.findMatches("L'article 42 prévoit").map((m) => m.index)).toEqual([1]);
    expect(matcher.findMatches('voir art. 7').map((m) => m.index)).toEqual([2]);
  });

  it('ignore un numéro d’article ambigu (partagé par plusieurs sources)', () => {
    const ambiguous: AssistantSource[] = [
      { id: 'a1', number: '42', document_title: 'Code du travail' },
      { id: 'a2', number: '42', document_title: 'Code de commerce' },
    ];
    const matcher = buildMentionMatcher(ambiguous)!;

    // « article 42 » est ambigu -> aucune mention « article N » liée…
    const matches = matcher.findMatches('article 42');
    expect(matches).toHaveLength(0);

    // …mais les titres restent repérables sans ambiguïté.
    expect(matcher.findMatches('le Code de commerce').map((m) => m.index)).toEqual([2]);
  });

  it('ignore les titres trop courts pour être sûrs', () => {
    const matcher = buildMentionMatcher([
      { id: 'x', number: null, document_title: 'Loi' },
    ])!;
    expect(matcher.findMatches('cette Loi est claire')).toHaveLength(0);
  });

  it('repère plusieurs mentions avec leurs positions', () => {
    const matcher = buildMentionMatcher(sources)!;
    const text = 'Le Code du travail et l’Acte uniforme OHADA.';
    const matches = matcher.findMatches(text);

    expect(matches.map((m) => m.index)).toEqual([1, 2]);
    expect(text.slice(matches[0].start, matches[0].end)).toBe('Code du travail');
    expect(text.slice(matches[1].start, matches[1].end)).toBe('Acte uniforme OHADA');
  });
});

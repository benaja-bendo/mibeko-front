import { describe, it, expect } from 'vitest';
import { answerWithSources } from './answerWithSources';

describe('copy answer with sources', () => {
  it('retains cited article references and their reader links without adding uncited results', () => {
    const result = answerWithSources({ id: 'm', role: 'assistant', content: 'Règle citée [2].', sources: [
      { id: 'a1', document_title: 'Non cité' },
      { id: 'a2', number: '7', document_id: 'd2', document_title: 'Texte cité' },
    ] }, 'https://app.example');
    expect(result).toContain('[2] Texte cité — Article 7');
    expect(result).toContain('https://app.example/app/library?doc=d2&article=a2');
    expect(result).not.toContain('Non cité');
  });
});

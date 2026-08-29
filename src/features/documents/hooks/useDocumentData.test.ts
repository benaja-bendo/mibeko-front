import { toVs } from './useDocumentData';

describe('toVs', () => {
  it('distingue draft de pending (régression : les deux se confondaient sous "pend")', () => {
    expect(toVs('draft')).toBe('draft');
    expect(toVs('pending')).toBe('pend');
  });

  it("mappe validated -> ok et error -> err", () => {
    expect(toVs('validated')).toBe('ok');
    expect(toVs('error')).toBe('err');
  });

  it('replie toute valeur inconnue ou absente sur pend (repli sûr, jamais draft par accident)', () => {
    expect(toVs(undefined)).toBe('pend');
    expect(toVs(null)).toBe('pend');
    expect(toVs('autre-chose')).toBe('pend');
  });
});

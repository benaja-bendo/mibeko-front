import { describe, it, expect } from 'vitest';
import { documentRoleLabel, documentRoleHint, legalScopeLabel, usageContextLabel, journalContentLabel } from './labels';

describe('labels métier', () => {
  it('traduit le rôle documentaire', () => {
    expect(documentRoleLabel('STOCK')).toBe('Texte consolidé');
    expect(documentRoleLabel('STOCK', { short: true })).toBe('Consolidé');
    expect(documentRoleLabel('FLUX')).toBe('Acte de journal officiel');
    expect(documentRoleLabel('FLUX', { short: true })).toBe('Journal off.');
  });

  it('retombe sur la valeur brute pour un rôle inconnu', () => {
    expect(documentRoleLabel('AUTRE')).toBe('AUTRE');
    expect(documentRoleLabel(null)).toBe('—');
  });

  it('donne une explication de rôle pour les tooltips', () => {
    expect(documentRoleHint('STOCK')).toContain('consolidé');
    expect(documentRoleHint('FLUX')).toContain('Journal officiel');
    expect(documentRoleHint(null)).toBe('');
  });

  it('traduit le périmètre juridique', () => {
    expect(legalScopeLabel('national')).toBe('National');
    expect(legalScopeLabel('ohada')).toBe('OHADA');
    expect(legalScopeLabel(undefined)).toBe('—');
  });

  it('traduit le cadre d\'usage', () => {
    expect(usageContextLabel('personal')).toBe('Personnel');
    expect(usageContextLabel('studies')).toBe('Études');
    expect(usageContextLabel('professional')).toBe('Activité professionnelle');
    expect(usageContextLabel('other')).toBe('Autre');
    expect(usageContextLabel(undefined)).toBe('—');
  });
});

describe('journalContentLabel', () => {
  it("annonce le PDF d'un numéro sans texte structuré, jamais « 0 texte » (D-056)", () => {
    expect(journalContentLabel(0)).toBe('Texte intégral (PDF)');
    expect(journalContentLabel(null)).toBe('Texte intégral (PDF)');
    expect(journalContentLabel(undefined)).toBe('Texte intégral (PDF)');
  });

  it('compte les textes publiés, au singulier et au pluriel', () => {
    expect(journalContentLabel(1)).toBe('1 texte publié');
    expect(journalContentLabel(16)).toBe('16 textes publiés');
  });
});

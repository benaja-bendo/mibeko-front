import { describe, it, expect } from 'vitest';
import { documentRoleLabel, documentRoleHint, legalScopeLabel } from './labels';

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
});

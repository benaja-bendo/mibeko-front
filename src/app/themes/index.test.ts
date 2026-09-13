import { DEFAULT_THEME_ID, getStoredThemeId, getTheme } from './index';

describe('thème initial', () => {
  beforeEach(() => localStorage.clear());

  it('utilise le thème clair quand aucune préférence n’existe', () => {
    expect(DEFAULT_THEME_ID).toBe('mibeko-classic');
    expect(getStoredThemeId()).toBe('mibeko-classic');
  });

  it('retombe sur le thème clair pour un identifiant inconnu', () => {
    expect(getTheme('theme-supprime').id).toBe('mibeko-classic');
  });
});

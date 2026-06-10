/**
 * themeStore.ts — État réactif du thème actif.
 *
 * `setTheme` applique le thème à chaud (variables CSS sur <html>) et le
 * persiste en localStorage ; la persistance côté compte (`user_settings.theme`)
 * est gérée par la carte Apparence des Paramètres. `ThemeAccountSync` aligne
 * l'appareil sur la préférence serveur au chargement de l'application.
 */
import { create } from 'zustand';
import { applyTheme, getStoredThemeId } from './index';

interface ThemeState {
  /** Identifiant du thème actif (toujours un id connu du registre). */
  themeId: string;
  setTheme: (id: string) => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
  themeId: getStoredThemeId(),
  setTheme: (id) => {
    const theme = applyTheme(id);
    set({ themeId: theme.id });
  },
}));

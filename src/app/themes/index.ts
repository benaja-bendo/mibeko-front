/**
 * index.ts — Registre des thèmes + moteur d'application.
 *
 * Le moteur écrit les variables CSS du contrat directement sur `<html>` :
 * Tailwind v4 référence ces variables (`var(--color-*)`) dans toutes les
 * utilities générées, donc l'application entière change d'apparence
 * instantanément, sans rechargement ni re-render global.
 *
 * Persistance locale : l'identifiant ET les variables résolues sont stockés
 * en localStorage pour que le script anti-flash d'index.html puisse repeindre
 * l'interface avant le premier paint, sans dépendre du bundle.
 */
import type { ThemeDefinition } from './types';
import { lexGold } from './lex-gold';
import { mibekoClassic } from './mibeko-classic';

export type { ThemeDefinition } from './types';

export const DEFAULT_THEME_ID = lexGold.id;

/** Registre ordonné — l'ordre est celui d'affichage dans les Paramètres. */
export const THEMES: ThemeDefinition[] = [lexGold, mibekoClassic];

const THEME_ID_KEY = 'mibeko:theme';
const THEME_VARS_KEY = 'mibeko:theme-vars';
const FONTS_LINK_ID = 'mibeko-theme-fonts';

export function getTheme(id: string | null | undefined): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function getStoredThemeId(): string {
  try {
    return localStorage.getItem(THEME_ID_KEY) ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

/** Aplati une définition de thème vers les variables CSS du contrat. */
export function themeToCssVars(theme: ThemeDefinition): Record<string, string> {
  const { colors: c, fonts: f, radii: r } = theme;
  return {
    '--color-bg': c.bg,
    '--color-s1': c.s1,
    '--color-s2': c.s2,
    '--color-s3': c.s3,
    '--color-s4': c.s4,
    '--color-b1': c.b1,
    '--color-b2': c.b2,
    '--color-b3': c.b3,
    '--color-t1': c.t1,
    '--color-t2': c.t2,
    '--color-t3': c.t3,
    '--color-t4': c.t4,
    '--color-gold': c.gold,
    '--color-on-gold': c.onGold,
    '--color-gold-d': c.goldD,
    '--color-gold-d2': c.goldD2,
    '--color-blue': c.blue,
    '--color-blue-d': c.blueD,
    '--color-green': c.green,
    '--color-green-d': c.greenD,
    '--color-red': c.red,
    '--color-red-d': c.redD,
    '--color-purple': c.purple,
    '--color-purple-d': c.purpleD,
    '--color-amber': c.amber,
    '--color-amber-d': c.amberD,
    '--font-display': f.display,
    '--font-body': f.body,
    '--font-mono': f.mono,
    '--radius-sm': r.sm,
    '--radius-md': r.md,
    '--radius-lg': r.lg,
  };
}

/** Charge la feuille Google Fonts du thème (sans doublonner). */
function ensureFontsLoaded(theme: ThemeDefinition): void {
  const existing = document.getElementById(FONTS_LINK_ID) as HTMLLinkElement | null;
  if (existing?.href === theme.fonts.googleFontsHref) return;

  const link = existing ?? document.createElement('link');
  link.id = FONTS_LINK_ID;
  link.rel = 'stylesheet';
  link.href = theme.fonts.googleFontsHref;
  if (!existing) document.head.appendChild(link);
}

/**
 * Applique un thème à chaud et le persiste localement.
 * Source de vérité serveur : `user_settings.theme` (voir AppearanceCard).
 */
export function applyTheme(id: string): ThemeDefinition {
  const theme = getTheme(id);
  const root = document.documentElement;
  const vars = themeToCssVars(theme);

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.dataset.theme = theme.id;
  root.style.colorScheme = theme.mode;
  ensureFontsLoaded(theme);

  try {
    localStorage.setItem(THEME_ID_KEY, theme.id);
    localStorage.setItem(THEME_VARS_KEY, JSON.stringify({ mode: theme.mode, vars }));
  } catch {
    // Stockage indisponible (navigation privée stricte) : le thème reste appliqué en mémoire.
  }

  return theme;
}

/** Applique le thème persisté localement au démarrage de l'application. */
export function bootstrapTheme(): ThemeDefinition {
  return applyTheme(getStoredThemeId());
}

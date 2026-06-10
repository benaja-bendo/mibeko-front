/**
 * types.ts — Contrat du moteur de thèmes.
 *
 * Un thème est une implémentation complète du « contrat de tokens » de
 * l'application : les variables CSS que Tailwind v4 consomme via `@theme`
 * (couleurs sémantiques, familles de polices, rayons). Les composants ne
 * connaissent que les tokens (`bg-s1`, `text-gold`, `font-display`…) — jamais
 * les valeurs — ce qui permet de changer l'apparence entière de l'application
 * en remplaçant les valeurs à chaud.
 *
 * Ajouter un thème = créer un fichier qui exporte une `ThemeDefinition` et
 * l'enregistrer dans le registre (`./index.ts`). Aucun composant à modifier.
 */

/** Tokens couleur du contrat — alignés sur `@theme` de globals.css. */
export interface ThemeColors {
  /** Fond de page. */
  bg: string;
  /** Surfaces par élévation croissante (cartes, inputs, états actifs…). */
  s1: string;
  s2: string;
  s3: string;
  s4: string;
  /** Bordures par contraste croissant. */
  b1: string;
  b2: string;
  b3: string;
  /** Texte par importance décroissante. */
  t1: string;
  t2: string;
  t3: string;
  t4: string;
  /** Accent principal de la marque (actions primaires, états actifs). */
  gold: string;
  /** Texte posé sur l'accent principal (boutons pleins). */
  onGold: string;
  /** Teintes diluées de l'accent (fonds d'états actifs). */
  goldD: string;
  goldD2: string;
  /** Couleurs sémantiques + leurs teintes diluées. */
  blue: string;
  blueD: string;
  green: string;
  greenD: string;
  red: string;
  redD: string;
  purple: string;
  purpleD: string;
  amber: string;
  amberD: string;
}

/** Familles de polices du contrat. */
export interface ThemeFonts {
  /** Titres et éléments display. */
  display: string;
  /** Texte d'interface. */
  body: string;
  /** Données techniques, labels, métadonnées. */
  mono: string;
  /** Feuille Google Fonts à charger pour ce thème (injectée à la volée). */
  googleFontsHref: string;
}

/** Rayons de bordure du contrat (consommés par rounded-sm/md/lg). */
export interface ThemeRadii {
  sm: string;
  md: string;
  lg: string;
}

/** Échantillons utilisés par les aperçus dans les Paramètres. */
export interface ThemePreview {
  bg: string;
  surface: string;
  accent: string;
  text: string;
  border: string;
}

export interface ThemeDefinition {
  /** Identifiant stable (slug) — persisté en base et en localStorage. */
  id: string;
  /** Nom affiché à l'utilisateur. */
  name: string;
  /** Une phrase de positionnement, affichée dans les Paramètres. */
  description: string;
  /** Pilote `color-scheme` (rendu natif des contrôles, scrollbars…). */
  mode: 'dark' | 'light';
  colors: ThemeColors;
  fonts: ThemeFonts;
  radii: ThemeRadii;
  preview: ThemePreview;
}

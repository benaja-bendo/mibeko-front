# Design system — mibeko-front

> Statut : à jour au 2 juillet 2026 · référence des tokens, thèmes et polices du dashboard React (`mibeko-front`).

Ce document décrit le design system réellement implémenté dans le code
(`src/app/themes/`, `src/app/styles/globals.css`). Il fait autorité sur les
valeurs : en cas de divergence avec un ancien mémo ou une capture, ce sont les
fichiers source cités ici qui priment.

## Principe : un contrat de tokens, plusieurs thèmes

Les composants ne référencent jamais de couleur, de police ou de rayon en dur.
Ils consomment uniquement des *tokens* sémantiques (`bg-s1`, `text-gold`,
`font-display`, `rounded-md`…). Ces tokens sont des variables CSS déclarées dans
le bloc `@theme` de `src/app/styles/globals.css`, où Tailwind v4 les lit pour
générer ses utilities.

Un thème est une implémentation complète de ce contrat. Le moteur de thèmes
(`src/app/themes/index.ts`) aplatit une `ThemeDefinition` vers ces variables CSS
et les écrit directement sur `<html>` (`document.documentElement.style`). Comme
Tailwind référence `var(--color-*)` dans toutes les utilities, changer de thème
repeint l'application entière à chaud, sans rechargement ni re-render global.

- **Contrat de types** : `src/app/themes/types.ts` (`ThemeColors`, `ThemeFonts`, `ThemeRadii`, `ThemePreview`, `ThemeDefinition`).
- **Registre + moteur** : `src/app/themes/index.ts` (`THEMES`, `applyTheme`, `themeToCssVars`, `bootstrapTheme`).
- **État réactif** : `src/app/themes/themeStore.ts` (store zustand `useThemeStore`).
- **Valeurs par défaut inline** : `src/app/styles/globals.css` (`@theme`) — ce sont exactement les valeurs du thème par défaut « Lex Gold », de sorte que le premier rendu soit déjà correct avant l'application JavaScript.

### Persistance et anti-flash

`applyTheme` persiste dans `localStorage` deux clés : `mibeko:theme`
(identifiant du thème) et `mibeko:theme-vars` (variables résolues + mode). Un
script anti-flash dans `index.html` peut ainsi repeindre l'interface avant le
premier paint, sans dépendre du bundle. La source de vérité côté compte est
`user_settings.theme` (voir la carte Apparence des paramètres et le provider
`ThemeAccountSync`, qui aligne l'appareil sur la préférence serveur au
chargement). Rappel : le dashboard n'a pas de CSP, et les tokens transitent par
`localStorage`.

## Thème par défaut : « Lex Gold » (sombre)

Thème actif par défaut (`DEFAULT_THEME_ID = 'lex-gold'`). Positionnement
« Prestige Technical » : minimalisme sombre, charbon profond et accent bronze,
pensé pour les longues sessions de revue documentaire par un persona avocat /
juriste. Source : `src/app/themes/lex-gold.ts` (`mode: 'dark'`).

### Couleurs

| Token | Variable CSS | Valeur | Usage |
| --- | --- | --- | --- |
| bg | `--color-bg` | `#0c0d0f` | Fond de page |
| s1 | `--color-s1` | `#141517` | Surface niveau 1 (cartes, sidebar) |
| s2 | `--color-s2` | `#1b1d21` | Surface niveau 2 |
| s3 | `--color-s3` | `#222428` | Surface niveau 3 |
| s4 | `--color-s4` | `#2a2d33` | Surface niveau 4 (états actifs) |
| b1 | `--color-b1` | `rgba(255,255,255,.055)` | Bordure la plus discrète |
| b2 | `--color-b2` | `rgba(255,255,255,.10)` | Bordure standard |
| b3 | `--color-b3` | `rgba(255,255,255,.16)` | Bordure de contraste |
| t1 | `--color-t1` | `#e9e7e1` | Texte principal |
| t2 | `--color-t2` | `#9b9891` | Texte secondaire |
| t3 | `--color-t3` | `#5e5c57` | Texte tertiaire / métadonnées |
| t4 | `--color-t4` | `#3a3936` | Texte désactivé |
| gold | `--color-gold` | `#c8a86a` | Accent principal (actions, états actifs) |
| onGold | `--color-on-gold` | `#120e00` | Texte posé sur l'accent (boutons pleins) |
| goldD | `--color-gold-d` | `rgba(200,168,106,.12)` | Teinte diluée de l'accent |
| goldD2 | `--color-gold-d2` | `rgba(200,168,106,.22)` | Teinte diluée renforcée |

Couleurs sémantiques (chacune accompagnée d'une teinte diluée `*D` pour les
fonds d'état) : `blue #5c8fd4`, `green #56a07a`, `red #c4614e`, `purple
#9478c8`, `amber #c4903a`.

### Polices

Chargées à la volée via une feuille Google Fonts propre au thème (injectée par
`ensureFontsLoaded`, `link#mibeko-theme-fonts`).

| Token | Variable CSS | Famille | Usage |
| --- | --- | --- | --- |
| display | `--font-display` | **Fraunces** (serif) | Titres, éléments display |
| body | `--font-body` | **Instrument Sans** (sans-serif) | Texte d'interface |
| mono | `--font-mono` | **DM Mono** (monospace) | Données techniques, labels, métadonnées |

Le `<body>` applique `font-body` par défaut avec une taille de base de `13px`
(interface dense ; voir `globals.css`).

### Rayons

| Token | Variable CSS | Valeur |
| --- | --- | --- |
| sm | `--radius-sm` | `5px` |
| md | `--radius-md` | `9px` |
| lg | `--radius-lg` | `14px` |

## Thème clair : « Mibeko Classique »

Second thème du registre (`id: 'mibeko-classic'`, `mode: 'light'`), proposé dans
les Paramètres à côté de Lex Gold. Minimalisme institutionnel inspiré des
archives juridiques congolaises : fond crème, vert forêt profond pour les
actions, terracotta sobre en accent secondaire ; contrastes calibrés WCAG AA
pour la lecture longue. Source : `src/app/themes/mibeko-classic.ts`.

Valeurs remarquables :

- Fond `bg #fcf9f8`, surface `s1 #ffffff`, texte principal `t1 #1b1c1c`.
- Accent principal (`gold`) porté par le vert forêt `#1e6b47` (choisi plus
  prononcé que le `#03271a` d'origine, qui paraissait noir), `onGold #ffffff`.
- Bordures en teinte du texte : `b1 rgba(27,28,28,.10)`, `b2 rgba(27,28,28,.16)`, `b3 rgba(27,28,28,.26)`.
- Rouge d'erreur `#ba1a1a`, vert de succès distinct `#10b981`, accent chaud `#8f4c31`.
- Polices : `display` et `body` en **Inter**, `mono` en **JetBrains Mono** (la
  feuille de fonts inclut aussi Source Serif 4).
- Rayons plus serrés : `sm 4px`, `md 6px`, `lg 8px`.

Cette palette forêt fait écho au site public (`mibeko-site`) et à l'app mobile
(`mibeko-app-kmp`), tandis que Lex Gold est propre au dashboard.

## Aperçus dans les Paramètres

Chaque thème expose un objet `preview` (`bg`, `surface`, `accent`, `text`,
`border`) utilisé pour dessiner l'échantillon cliquable dans la carte Apparence
des Paramètres, sans avoir à appliquer le thème pour le prévisualiser.

## Ajouter un thème

1. Créer `src/app/themes/<mon-theme>.ts` exportant une `ThemeDefinition`
   complète (toutes les clés de `ThemeColors`, `ThemeFonts`, `ThemeRadii`,
   `ThemePreview`).
2. L'enregistrer dans le registre `THEMES` de `src/app/themes/index.ts` (l'ordre
   du tableau est l'ordre d'affichage dans les Paramètres).

Aucun composant n'est à modifier : ils ne connaissent que les tokens.

## Historique

Le thème forêt d'origine du dashboard (avant l'adoption de Lex Gold comme
défaut) est archivé, pour référence, dans
[`_archive/design-foret-obsolete.md`](./_archive/design-foret-obsolete.md). Ne
pas s'en servir pour de nouvelles valeurs.

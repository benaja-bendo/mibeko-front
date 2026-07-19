import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// ---------------------------------------------------------------------------
// Frontières d'architecture FSD (Feature-Sliced Design)
// ---------------------------------------------------------------------------
// Couches, du plus haut au plus bas :
//     app → pages → widgets → features → shared
// On verrouille les dépendances ASCENDANTES (une couche ne remonte jamais vers
// une couche supérieure) avec la règle native `no-restricted-imports` — aucune
// dépendance de lint supplémentaire requise. Les imports vers `shared` restent
// toujours autorisés.
//
//  - shared   ↛ app, pages, widgets, features   (la base ne connaît personne)
//  - features ↛ pages, widgets                  (une feature ne remonte pas)
//  - widgets  ↛ app, pages                      (widgets → features, shared)
//  - pages    ↛ app                             (pages → widgets, features, shared)
//  - app      → tout                            (couche de composition, non bridée)
//
// NB 1 : les imports LATÉRAUX entre features (`viewer` → `documents`, etc.) sont
//   aujourd'hui nombreux et assumés (`documents` sert de socle métier partagé).
//   On ne les bloque donc pas ici pour garder le lint à zéro erreur ; leur
//   resserrement (barrels d'API publics par feature) est un chantier à part.
// NB 2 : `features ↛ app` n'est pas encore verrouillé à cause d'un unique
//   couplage résiduel (`settings/AppearanceCard` → `@/app/themes`, thème = config
//   applicative). À traiter en déplaçant le store de thème avant d'ajouter `@/app`
//   à la liste ci-dessous.

const denyImport = (patterns) => ['error', { patterns }]

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },

  // shared/ : couche de base, ne remonte jamais vers une couche supérieure.
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': denyImport([
        {
          group: [
            '@/app', '@/app/*',
            '@/pages', '@/pages/*',
            '@/widgets', '@/widgets/*',
            '@/features', '@/features/*',
          ],
          message:
            'Interdit (FSD) : `shared` ne peut pas importer une couche supérieure. Extraire l’abstraction dans `shared` et l’alimenter depuis `features`/`app`.',
        },
      ]),
    },
  },

  // features/ : ne remonte pas vers pages/widgets (features → shared + latéral).
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': denyImport([
        {
          group: ['@/pages', '@/pages/*', '@/widgets', '@/widgets/*'],
          message:
            'Interdit (FSD) : une `feature` ne peut pas importer `pages`/`widgets`. Une feature ne dépend que de `shared` (et, temporairement, d’autres features).',
        },
      ]),
    },
  },

  // widgets/ : compose des features en briques d'UI, sans remonter vers app/pages.
  {
    files: ['src/widgets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': denyImport([
        {
          group: ['@/app', '@/app/*', '@/pages', '@/pages/*'],
          message:
            'Interdit (FSD) : un `widget` ne peut pas importer `app`/`pages`. Un widget dépend de `features` et `shared`.',
        },
      ]),
    },
  },

  // pages/ : compose widgets + features + shared, mais ne remonte pas vers app.
  {
    files: ['src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': denyImport([
        {
          group: ['@/app', '@/app/*'],
          message:
            'Interdit (FSD) : une `page` ne peut pas importer `app`. Remonter la composition dans `app/` ou passer par `widgets`/`features`/`shared`.',
        },
      ]),
    },
  },
])

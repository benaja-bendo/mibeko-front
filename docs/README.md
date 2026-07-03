# Documentation — mibeko-front

> Statut : à jour au 2 juillet 2026 · index de la documentation du dashboard React (`mibeko-front`).

`mibeko-front` est le dashboard React 19 de Mibeko (SaaS LegalTech, droit du
Congo-Brazzaville) : Vite, Tailwind v4, TanStack Query et zustand, en
architecture Feature-Sliced Design. Ce dossier regroupe la documentation
transverse du dépôt (voir le `README.md` racine pour l'installation, le
développement et le build).

## Architecture (Feature-Sliced Design)

Le code de `src/` est découpé en couches FSD, de la plus haute (composition) à
la plus basse (réutilisable) :

- **`app/`** — socle applicatif : point d'entrée, providers (auth, TanStack
  Query, synchronisation du thème), router (`react-router-dom`, avec gardes de
  rôle `RequireAuth`), moteur de thèmes (`app/themes/`) et styles globaux
  (`app/styles/globals.css`).
- **`pages/`** — pages routées, assemblant des features (répertoire `pages/app`,
  `pages/admin`, `pages/settings`…).
- **`features/`** — tranches métier autonomes : `assistant`, `library`,
  `dossiers`, `documents`, `ingestion`, `journals`, `viewer`, `auth`,
  `billing`, `settings`, `admin`.
- **`shared/`** — briques transverses sans logique métier : `api`, `components`,
  `hooks`, `lib`, `store`, `types`.

## Les trois espaces

Le dashboard sert trois espaces, cloisonnés par rôle dans le router
(`src/app/router/`) :

- **`/app`** — espace **pro** (persona avocat / juriste) : assistant IA,
  bibliothèque (`/app/library`), dossiers, journaux officiels, offre
  (`/app/upgrade`).
- **`/editor`** — espace **éditorial** : ingestion du corpus, documents, lecteur
  (`/editor/viewer/:id`), journaux, paramètres éditeur. Accès réservé aux rôles
  `editor` et `admin`.
- **`/admin`** — espace **administration** : tableau de bord, utilisateurs,
  référentiels, signalements, audit. Accès réservé au rôle `admin`.

Les paramètres transverses vivent sous `/settings/*` (compte, notifications,
facturation, support).

## Documents

| Document | Description |
| --- | --- |
| [design-system.md](./design-system.md) | Design system à jour : contrat de tokens, moteur de thèmes, thème par défaut « Lex Gold » (bronze) et thème clair « Mibeko Classique », polices Fraunces / Instrument Sans / DM Mono. |
| [_archive/design-foret-obsolete.md](./_archive/design-foret-obsolete.md) | Ancien thème forêt (vert / crème) du dashboard, conservé pour historique. Obsolète — ne pas s'en servir pour de nouvelles valeurs. |

## Conventions

Chaque fichier de ce dossier commence par un titre puis une ligne
« Statut : à jour au \<date\> · \<portée\> ». La documentation est **datée et
évolutive** : elle décrit l'état du code à une date donnée et doit être mise à
jour lorsque le code change. Pour tout détail précis (valeur de token, police,
route, version), les fichiers source du dépôt font autorité sur la
documentation.

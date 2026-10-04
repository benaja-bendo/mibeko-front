# Registre des décisions — dashboard web (mibeko-front)

> Statut : à jour au 4 octobre 2026 · **Fait autorité sur** : les décisions en vigueur qui ne changent que le code de ce dépôt. Les décisions qui touchent plusieurs dépôts (compte unique, entitlements, onboarding commun, prix du Pro…) sont dans le registre transverse (`docs/decisions.md` du monorepo, dépôt `mibeko-docs`), qui donne aussi le gabarit et les règles (D-001).

Identifiants `FRONT-NNN`, jamais réutilisés ; une nouvelle décision s'ajoute à la fin. Les décisions reprises le 28/09/2026 ne portent « Écarté » et « On rouvre si » que si l'original les donnait ; texte d'origine : `docs/_archive/2026-09-28-journal-decisions-2026-07-a-09.md` (dépôt `mibeko-docs`).

### FRONT-001 · 2026-09-13 · Le thème initial est « Mibeko Classique » ; la vérification de l'e-mail précède l'onboarding
**Statut** : en vigueur · **Réf.** : D-023, D-024

**Décision** : le défaut applicatif, les tokens du premier rendu et le défaut serveur de `user_settings.theme` convergent sur `mibeko-classic`. Lex Gold reste un choix explicite, et aucune préférence existante n'est réécrite. Après l'inscription, `/auth/verifier-email` conserve l'intention (`next=assistant`) ; l'onboarding ne commence qu'après la vérification, quand elle est imposée.
**Contexte** : Lex Gold créait une rupture visuelle après le site public.

### FRONT-002 · 2026-09-12 · Onboarding web : le statut serveur décide seul qui voit l'accueil
**Statut** : en vigueur · **Réf.** : mibeko-front#40, D-022

**Décision** : `enrollment.status` est la seule source de vérité, sans segmentation en `localStorage`. L'accueil est monté dans `AppLayout`, sur `/app/*` et hors staff. L'étape « objectif » réutilise l'étape serveur `discover_sources`. En rejeu, seule la dernière étape appelle le serveur : les précédentes ne sont qu'une navigation locale.
**Contexte** : rejouer la première étape refermait le guide après un seul clic.

### FRONT-003 · 2026-09-12 · Dans le chat web, la réponse passe avant les sources
**Statut** : en vigueur

**Décision** : les sources reçues pendant le flux servent tout de suite aux citations cliquables, mais leurs cartes restent masquées jusqu'à la fin d'une réponse réussie. Le bloc « Sources citées » est alors replié et ne contient que les extraits cités, sans renuméroter les marqueurs. Une réponse interrompue garde ses liens, sans ce bloc.

### FRONT-004 · 2026-10-04 · Un onglet resté sur un build remplacé se recharge une fois ; les anciens fichiers ne restent pas en ligne
**Statut** : en vigueur · **Réf.** : mibeko-front#68

**Contexte** : chaque page est un fichier `/assets/` haché, chargé à la demande, et chaque déploiement remplace le conteneur nginx. Un onglet ouvert avant un déploiement demandait, à la première visite d'une page, un fichier qui répond 404, et React Router affichait son écran de développement (« Failed to fetch dynamically imported module »). Trois déploiements le 02/10/2026 : tout onglet resté ouvert y était exposé.
**Décision** : une route racine sans chemin porte un `errorElement` unique (`src/app/router/RouteErrorPage.tsx`). Sur une erreur de chargement de module, il recharge la page une fois (`src/shared/lib/chunkReload.ts` : garde de 10 s en `sessionStorage`, pas de rechargement hors ligne). Sinon, et pour toute autre erreur, il affiche un écran en français avec le message technique et une issue.
**Écarté** : conserver les fichiers des builds précédents (volume sur le VPS ou copie depuis l'image précédente), plus doux pour l'onglet ouvert mais qui touche le déploiement et le VPS et exige une purge ; l'écouteur global `vite:preloadError`, redondant tant que toutes les pages chargées à la demande passent par le routeur.
**Conséquences** : la page demandée s'ouvre après un rechargement. Rien n'est perdu de plus qu'avant : la page précédente est déjà démontée par la navigation.
**On rouvre si** : un chargement à la demande apparaît hors du routeur (`lazy` dans une page, `import()` dans un gestionnaire), ou si l'écran « Page indisponible » est encore signalé après un déploiement.

# CLAUDE.md — mibeko-front

## Contexte
Dashboard React 19 de Mibeko (legaltech **Congo-Brazzaville**, jamais la RDC), servi sur `app.mibeko.fr`. Un des 7 dépôts du monorepo — voir le `CLAUDE.md` à la racine pour la carte, la base partagée et les conventions communes (ne pas les recopier ici). Trois espaces cloisonnés : `/app` (poste de travail pro), `/editor` (curation du corpus), `/admin` (administration), plus `/settings/*` transverse.

**Règle transverse n°1 : toute UI va ici.** Le legacy Inertia de `mibeko-tableau-de-bord` (`resources/js/pages`, ~200 fichiers quasi tous inatteignables) est mort et en cours de dépose — ne jamais y ajouter une page, un composant ou une route. Backend/PDF côté Laravel, oui ; UI, non.

## Architecture FSD — telle qu'elle est réellement
Couches, du haut vers le bas : `app/` → `pages/` → `widgets/` → `features/` → `shared/`. Les dépendances **ascendantes** sont bloquées par `no-restricted-imports` dans `eslint.config.js` (lire ses commentaires : ils documentent les exceptions assumées). Deux points à connaître :
- Les imports **latéraux entre features** sont nombreux et assumés (`documents` sert de socle métier partagé) : le lint ne les bloque pas.
- `features ↛ app` n'est **pas** verrouillé, à cause d'un couplage résiduel unique (`settings/AppearanceCard` → `@/app/themes`). Ne pas en créer d'autres.

Où poser quoi :
- **Composant réutilisable sans métier** → `shared/components/ui/` (composants maison sur Radix + tokens de thème ; il n'y a **pas** de `components.json`, donc `npx shadcn add` recrache du Tailwind générique à réécrire).
- **Nouvelle fonctionnalité** → `src/features/<nom>/` avec le découpage constaté : `api/<nom>Api.ts`, `components/`, `hooks/use*.ts`, `store/`, `types.ts`.
- **Nouvel appel API** → une fonction dans le `api/` de la feature, consommée par un hook TanStack Query ; jamais d'`axios` nu dans un composant.
- **Page routée** → `src/pages/…` + entrée dans `src/app/router/routeElements.tsx` puis `src/app/router/index.tsx`.
- `shared` ne peut pas importer `features` : si une brique basse a besoin de l'auth, suivre le patron d'inversion déjà en place (`shared/auth/tokenAccess.ts` + `configureTokenAccess` appelé par `features/auth/store/authStore.ts`).

## Commandes (source de vérité : `package.json`)
```bash
npm run dev        # Vite, port 5173 (défaut, non forcé dans vite.config.ts)
npm run lint       # eslint .
npm run test:run   # vitest une passe  ⚠️ `npm test` seul = mode WATCH, il ne rend jamais la main
npm run build      # tsc -b && vite build  → c'est le SEUL endroit où tsc -b tourne
```
**Obligatoire avant de considérer un travail terminé** : `npm run lint` + `npm run test:run` + `npm run build` — exactement, et dans cet ordre, ce que fait `.github/workflows/ci.yml`. Il n'existe pas de script `typecheck` : sauter le build revient à ne pas typer.

Proxys de dev (`vite.config.ts`) : `/api/v1` → `http://localhost:8000` (Laravel), `/py` → `http://localhost:8001` (Python, préfixe réécrit). **Piège** : ces proxys ne servent que de repli. Dès que `.env` définit `VITE_LARAVEL_API_URL` / `VITE_PYTHON_API_URL` (c'est le cas du `.env` local livré), axios tape les backends en direct et le proxy est court-circuité — un souci de CORS ou de port se lit là, pas dans `vite.config.ts`.

## Invariants et pièges
- **TypeScript strict activé** (`tsconfig.app.json` : `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`). Il ne reste qu'une poignée de `any`, tous avec un `eslint-disable` nominatif : ne pas en ajouter, ne pas désactiver la règle globalement. `verbatimModuleSyntax` impose `import type` pour les types.
- **Alias `@` → `src/`** déclaré **trois fois** : `vite.config.ts`, `vitest.config.ts`, `tsconfig.app.json`. Tout nouvel alias doit être ajouté aux trois, sinon ça marche en dev et casse en test ou au build.
- **CSP de production** posée par `docker/nginx/default.conf` : toute nouvelle origine externe (CDN, police, websocket, endpoint) marche en dev et est **bloquée en prod** tant qu'elle n'est pas ajoutée là. Deux sous-pièges : `connect-src` doit rester aligné sur les `VITE_*_API_URL` passés en `ARG` Docker ; le `script-src` contient un `sha256-` du script anti-flash inline d'`index.html` — le modifier sans recalculer le hash (commande donnée dans le fichier) casse l'anti-flash. `docs/design-system.md` affirme encore « le dashboard n'a pas de CSP » : c'est périmé, le fichier nginx fait foi.
- **Destination par défaut d'un compte : une seule règle, `features/auth/redirect.ts`.** `defaultRedirectFor()` est partagée par `LoginPage`, `RegisterPage`, `RedirectIfAuthenticated` et `RootRedirect`. Un compte **sans** `user_pro` va sur `/settings/account` : tout `/app*` exige `user_pro` et y renvoyer un nouveau compte l'accueille par « Fonctionnalité réservée aux abonnés Pro ». Ne pas réintroduire de redirection locale dans un de ces quatre points — c'est exactement la divergence qui avait produit le défaut (26/08/2026).
- **L'inscription et la réinitialisation de mot de passe vivent ici**, pas sur `mibeko.fr` dont la règle absolue interdit tout compte : `/auth/register`, `/auth/mot-de-passe-oublie`, `/auth/reinitialiser`. La réinitialisation se fait par **code à 6 chiffres envoyé par e-mail** (15 min), pas par lien. ⚠️ `PasswordResetCodeNotification` est `ShouldQueue` : sans worker de file, aucun code ne part et l'API répond quand même 200 (anti-énumération volontaire) — en local, `QUEUE_CONNECTION=sync` ou un `queue:work` lancé à la main.
- **Les rôles ne sont pas une sécurité.** `admin` / `editor` / `user_pro` / `mobile_user` (`shared/types/auth.ts`) ne sont filtrés que côté client, dans `src/app/router/guards.tsx`. Aucune vérification serveur n'existe aujourd'hui sur les routes dossiers / assistant / export ; pire, `user.roles` vient du `localStorage` persisté et est éditable par l'utilisateur. Le garde-fou est un aiguillage d'UX, pas un verrou — ne jamais lui confier une donnée qui doit rester inaccessible.
- **État d'auth en cache** : zustand `persist` sous la clé `mibeko_token`, `partialize` ne garde que `{ token, user }`. L'`impersonator` (session admin d'origine) est volontairement **hors** du storage — ne pas le persister « pour améliorer l'ergonomie », c'est une décision de sécurité commentée dans `authStore.ts`. Au démarrage, `AuthProvider` revalide via `fetchMe()` et bloque le rendu tant que `isInitialized` est faux.
- **Erreurs API déjà normalisées** : les deux intercepteurs axios (`shared/api/laravelClient.ts`, `pythonClient.ts`) rejettent un `Error` dont le `message` est lisible (`message` Laravel, `detail` FastAPI y compris les tableaux 422) et purgent la session sur 401. Dans un `catch`, `error.response` n'existe plus : utiliser `toast.fromError(err)` (`shared/store/useToast.ts`, `<Toaster />` monté une seule fois dans le layout).
- **Libellés métier** : passer par `shared/lib/labels.ts` et `legalLabels.ts` (STOCK/FLUX, statuts de curation…). Ne pas réécrire une traduction en dur dans un composant.
- **Couleurs, polices et rayons uniquement via les tokens** (`bg-s1`, `text-t2`, `text-gold`, `font-display`…). Aucune valeur en dur : le moteur de thèmes réécrit les variables CSS à chaud sur `<html>`.
- **PDF sans CDN** : les assets pdfjs sont auto-hébergés par le plugin Vite maison (`/pdfjs-assets/*`) et le worker est émis par Vite. Ne jamais rebrancher un CDN — la CSP le bloquerait de toute façon.
- **SSE via `fetch` + `ReadableStream`** (`shared/api/sse.ts`), pas `EventSource` : celui-ci ne sait ni poster un corps ni porter l'en-tête `Authorization`. Réutiliser les primitives existantes.
- **Tests** : Vitest + Testing Library + MSW, fichiers colocalisés `*.test.ts(x)`. `src/test/setup.ts` lance MSW avec `onUnhandledRequest: 'error'` → **tout nouvel appel HTTP dans un composant testé fait échouer les tests** tant qu'il n'a pas de handler dans `src/test/msw/handlers.ts` (ou un `server.use()` local).
- **Umami** est injecté au build uniquement si `VITE_UMAMI_URL` **et** `VITE_UMAMI_WEBSITE_ID` sont fournis (`ARG` Docker) ; sinon aucun script n'est chargé. Ne pas installer un second outil d'analytics.
- **Compilateur React activé** (`babel-plugin-react-compiler` dans `vite.config.ts`) : la mémoïsation manuelle est en général inutile, et `react-hooks/set-state-in-effect` est désactivé volontairement dans `eslint.config.js`.
- **Code mort connu** (inventorié, à ne pas ressusciter) : `features/viewer/components/Splitter.tsx`, les barrels `index.ts` de features (aucun n'est importé — importer par chemin complet) et quelques exports orphelins (`ROLE_HIERARCHY`, `hasPermission`, `StatusDot`…). Détail : `docs/produit/nettoyage-monorepo-2026-08-01.md` (dépôt `docs/`).

## Marque — divergence assumée
Le dashboard tourne sous le thème **« Lex Gold »** (sombre, bronze ; `DEFAULT_THEME_ID = 'lex-gold'`), alors que le site et l'app mobile sont en « forêt ». L'unification sur « forêt » est **décidée** (`docs/decisions.md`, 31/07/2026) mais **le sort du dashboard n'est pas tranché** : ne pas propager Lex Gold vers les autres dépôts, et ne pas le retirer d'initiative non plus. Un second thème forêt clair existe déjà ici (`mibeko-classic`) si le besoin se pose.

## Renvois (ne pas dupliquer)
- Point d'entrée transverse : `docs/README.md` (dépôt `docs/`) — il indique quel fichier répond à quelle question.
- Ce qui va sur quelle surface (site / mobile / espace pro) : `docs/produit/positionnement-site-app.md`.
- Design (tokens, thèmes, polices, ajout d'un thème) : `docs/design-system.md` **local à ce dépôt**.
- Conventions monorepo, démarrage de l'infra locale, invariants du corpus : `CLAUDE.md` racine.

## Conventions de travail
- Commits en français, `type(scope): titre` à l'impératif ou au substantif ; corps qui explique le **POURQUOI** (pas la liste des fichiers). Petits commits atomiques, un sujet par commit. Trailer `Co-Authored-By: <Nom du modèle> <noreply@anthropic.com>` pour un commit produit par un agent.
- **Jamais de commit, de push ou de tag sans l'accord explicite de l'utilisateur** — donner les commandes et attendre la réponse.
- Toute décision structurante = une ligne datée dans `docs/decisions.md` (dépôt `docs/`, transverse).
- Avant de corriger un constat d'audit ou de doc, le **vérifier contre le code courant** : les références bougent vite, et les docs datées de ce dépôt peuvent avoir pris du retard (cas de la CSP ci-dessus).

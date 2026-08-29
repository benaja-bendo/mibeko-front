# Dossier de travail — faire corriger un document par une IA extérieure

> Statut : à jour au 29 août 2026 · mode d'emploi de la fonctionnalité « Dossier de travail » du lecteur éditorial (`/editor/viewer/:id`), et du prompt à donner à l'IA qui fera la correction. Pour la conception et les décisions, voir [`docs/pipeline/plan-dossier-de-travail-2026-08.md`](../../docs/pipeline/plan-dossier-de-travail-2026-08.md) du dépôt `docs`, qui fait autorité en cas de contradiction.

## Ce que c'est, et ce que ce n'est pas

Le dossier de travail sort l'état structuré d'un document — sa hiérarchie, le texte de ses articles, ses repères de page — dans un fichier JSON. Vous confiez ce fichier **et le PDF officiel** à l'IA de votre choix, elle vous rend une version corrigée, vous la redéposez dans Mibeko, vous lisez ce qui change, puis vous appliquez.

Trois principes, dans cet ordre :

1. **Le PDF officiel fait foi.** Pas le fichier, pas la réponse du modèle, pas ce que le modèle croit savoir du droit congolais.
2. **Mibeko reste le système de référence.** Le fichier est une *proposition*. Il n'écrit rien de lui-même.
3. **Vous gardez la décision.** Le dépôt ne déclenche qu'une simulation ; l'application est un second geste, explicite, qui exige un motif.

Ce n'est **pas** un canal de publication : appliquer une proposition ne publie jamais. Ce n'est **pas** non plus une nouvelle version du droit : corriger une erreur d'OCR ou de découpage rectifie la version active, sans ouvrir de nouvelle période juridique.

## Qui peut s'en servir

L'entrée « Dossier de travail » apparaît dans le menu de téléchargement du lecteur, pour les rôles `editor` et `admin`. L'autorisation suit ensuite l'**état du document**, pas la route :

| État du document | Export | Application |
| --- | --- | --- |
| `draft`, `review`, `validated` — jamais publié | éditeur | éditeur |
| déjà publié, ou provisoirement retiré du public | admin | admin |

Un document déjà publié se répare sous responsabilité d'administrateur, parce que l'écriture atteint le corpus public.

## Le parcours, pas à pas

### 1. Exporter

Lecteur → icône de téléchargement → **Dossier de travail** → *Télécharger le dossier de travail*.

Vous obtenez un fichier nommé d'après le document, par exemple `decret-en-conseil-de-ministres_dossier-de-travail.json`. Il contient :

- `expected_fingerprint` — l'empreinte de l'état mesuré à l'instant de l'export ; c'est elle qui détectera qu'un collègue a modifié le document entre-temps ;
- `target.source_pdf.sha256` — l'empreinte du PDF officiel rattaché ;
- `target.nodes` — les divisions (titres, chapitres…), chacune avec son `id` ;
- `target.articles` — les articles, chacun avec son `id`, son numéro, son texte et son repère de page.

**Récupérez aussi le PDF original** (même menu, *PDF Original*). Sans lui, l'IA n'a rien contre quoi vérifier.

### 2. Faire corriger

Ouvrez la conversation de votre choix, joignez **le PDF et le fichier JSON**, et donnez le prompt de la section suivante.

### 3. Déposer

Revenez dans la même modale → *Déposer la proposition*. Mibeko contrôle d'abord le fichier localement (bon document, bon PDF, version de format), puis demande au serveur une **simulation** : aucune écriture n'a lieu.

Si la proposition est identique à l'état courant, l'écran le dit et s'arrête là.

### 4. Lire ce qui change

L'écran affiche, dans cet ordre :

- **l'avertissement de suppression**, en rouge, s'il y en a une — voir plus bas ;
- les compteurs : articles retirés, ajoutés, renumérotés, textes modifiés, repères modifiés, divisions retirées ;
- le total de caractères avant → après ;
- la liste des articles touchés, dépliable pour comparer le texte avant et après ;
- les signalements du serveur (`contenu vidé`, `contenu raccourci`).

### 5. Appliquer

Écrivez un **motif** (20 caractères minimum — il est audité) puis *Appliquer la proposition*.

Après application sur un document jamais publié : un document `validated` **repasse en `review`**, et les articles dont le texte a changé repassent en `pending`. C'est voulu : une proposition appliquée n'a été relue par personne.

**La publication reste une étape distincte**, par le bouton habituel. Relancez la détection d'anomalies avant de proposer le document à la publication.

## La garde sur les suppressions

C'est la règle centrale de la fonctionnalité.

> Une réponse d'IA tronquée produit exactement la même chose qu'une suppression voulue.

Si la proposition retire des articles, l'application est **bloquée** tant que vous n'avez pas **recopié le nombre exact** d'articles retirés. C'est un nombre à saisir, pas une case à cocher : on coche sans lire, on ne recopie pas un compte sans le voir.

Si ce nombre vous surprend, **ne le confirmez pas**. Redemandez le fichier complet à l'IA.

## Le prompt à donner à l'IA

Copiez ce texte tel quel, en joignant le PDF officiel et le fichier JSON.

```text
Tu corriges la transcription d'un texte juridique du Congo-Brazzaville.

Je te donne deux fichiers :
- le PDF officiel du texte : c'est LA SOURCE DE VÉRITÉ, sans exception ;
- un fichier JSON décrivant ce que notre base contient aujourd'hui.

Ta tâche : comparer le JSON au PDF, page par page, et me rendre le MÊME
fichier JSON corrigé pour qu'il corresponde fidèlement au PDF.

RÈGLES ABSOLUES

1. Fidélité, jamais amélioration. Tu ne reformules pas, tu ne modernises pas
   l'orthographe, tu ne corriges pas la grammaire du texte officiel. Une
   coquille présente dans le JO reste dans le texte : elle est fidèle.
2. Tu ne complètes jamais de mémoire. Si un passage du PDF est illisible,
   écris [...] à l'endroit manquant. N'invente pas la suite, même si elle te
   paraît évidente.
3. Tu ne supprimes rien en silence. Si tu ne peux pas traiter tout le
   document, DIS-LE et rends-moi seulement ce que tu as vérifié, en me
   précisant où tu t'es arrêté. Ne rends jamais un fichier amputé sans
   avertissement : un article absent de ta réponse sera compris comme une
   demande de suppression.
4. Tu conserves tous les identifiants. Chaque objet portant un champ "id"
   doit le rendre à l'identique, caractère pour caractère. Tu n'inventes
   jamais d'identifiant : un nouvel article se rend SANS champ "id".
5. Tu ne touches pas à "schema_version", "document_id", "source_pdf",
   "expected_fingerprint" ni "semantic_fingerprint". Recopie-les tels quels.

CE QUE TU PEUX CORRIGER

- "content" : le texte de l'article, contre le PDF.
- "number" : le numéro de l'article, s'il est mal transcrit. Garde l'"id" :
   c'est ce qui permet de corriger un numéro sans perdre l'historique.
- "title", "number", "type" des divisions (TITRE, CHAPITRE, SECTION...).
- "source_locator" : {"page": N} où N est la page du PDF (première page = 1).
   Ajoute "page_end" si l'article s'étend sur plusieurs pages. Ne fournis un
   rectangle (x, y, width, height) que si tu en es certain — la page seule
   suffit, un rectangle faux est pire que pas de rectangle.
- "order" et "parent" pour rétablir la structure réelle.

CONTRAINTES DE FORME (le serveur refuse le fichier sinon)

- "order" doit être unique sur l'ENSEMBLE des divisions et des articles.
- Deux articles ne peuvent pas porter le même "number".
- Le "parent" d'un article ou d'une division doit être la "key" d'une
  division qui apparaît AVANT elle dans la liste "nodes".
- Chaque article doit avoir un "source_locator" (même vide : {}).
- Toute page indiquée doit exister dans le PDF : elle est vérifiée, une page
  hors du document fait rejeter le fichier entier.

RENDU

Rends UNIQUEMENT le fichier JSON complet, valide, sans commentaire autour.
Puis, dans un second message séparé, liste en français ce que tu as changé et
ce dont tu n'es pas sûr.
```

### Pourquoi ce prompt est écrit ainsi

Chaque règle répond à une façon connue de se tromper :

- la règle 1 existe parce qu'un modèle « corrige » spontanément les coquilles du Journal officiel, ce qui falsifie la source ;
- la règle 2 reprend une convention interne : un scan illisible se marque `[...]`, il ne se comble jamais par inférence ;
- la règle 3 est la contrepartie de la garde sur les suppressions — c'est la troncature silencieuse qui est dangereuse, pas la troncature avouée ;
- la règle 4 protège l'historique : un article qui perd son `id` est recréé, et ses versions et ses périodes de validité disparaissent avec lui ;
- les contraintes de forme sont exactement celles que le serveur vérifie, autant les annoncer.

### Conseils d'usage

**Travaillez par documents de taille raisonnable.** Aucun modèle ne régénère fidèlement plusieurs milliers d'articles en une réponse. Sur un code volumineux, l'export d'un sous-arbre n'existe pas encore ([`mibeko-dashboard#71`](https://github.com/benaja-bendo/mibeko-dashboard/issues/71)) : en attendant, préférez ce canal pour les documents courts et les cas structurellement cassés.

**Relisez la liste des changements avant d'appliquer**, en particulier les articles dont le nombre de caractères chute fortement.

**Si l'IA vous rend un fichier tronqué**, le dépôt vous le dira sous forme de suppressions. Ne confirmez pas : redemandez.

## Ce que le serveur refuse, et pourquoi

| Refus | Cause | Ce qu'il faut faire |
| --- | --- | --- |
| « appartient à un autre document » | le fichier vient d'un autre texte | reprendre le bon export |
| « Le PDF de référence du fichier ne correspond pas » | le PDF rattaché a changé depuis l'export | réexporter |
| « L'extraction publiée a changé depuis la mesure préparatoire » | quelqu'un a modifié le document entre-temps | réexporter et refaire corriger |
| « Cette cible retire N article(s) » | suppressions non confirmées | recopier le nombre, ou refuser |
| « renvoie à la page N, hors du PDF source » | l'IA a inventé ou décalé une page | le signaler à l'IA, en rappelant le nombre de pages réel |
| « Chaque numéro d'article doit être unique » | l'IA a produit deux fois le même numéro | le signaler à l'IA |
| « Le parent doit exister et précéder son enfant » | ordre des divisions incohérent | le signaler à l'IA |
| 403 | document publié, compte éditeur | demander à un administrateur |

## Limites connues au 29 août 2026

- **Le contrôle de page est actif sur tout le corpus de production** depuis le 29/08/2026 : les 141 PDF source y ont été mesurés, aucun n'est resté illisible. Il reste conditionné à cette mesure — un PDF dont le nombre de pages serait inconnu ne ferait rien échouer, le contrôle se tairait. Sur une base restaurée ou un environnement neuf, le remplir par `python main.py backfill-page-count --execute` côté `mibeko-python`.
- **Pas de contrôle du rectangle** : ses dimensions ne sont pas stockées, et le rectangle reste facultatif. N'en demandez pas à l'IA.
- **Pas d'export partiel** : le fichier porte toujours le document entier ([`mibeko-dashboard#71`](https://github.com/benaja-bendo/mibeko-dashboard/issues/71)).
- **Pas de rectangle affiché sur le PDF** : le lecteur a un référentiel de coordonnées à corriger avant ([`mibeko-front#9`](https://github.com/benaja-bendo/mibeko-front/issues/9)).
- **Certains articles n'ont aucun repère de page** — mesuré sur un document réel : 7 sur 23. L'écran affiche alors `—`, ce n'est pas une erreur.
- **Pas d'historique des imports dans le lecteur** : la trace existe dans les métadonnées du document et le journal d'audit, mais aucune interface ne la montre encore.

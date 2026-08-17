/**
 * Numéro d'article tel qu'affiché à l'éditeur.
 *
 * L'ingestion suffixe en `_doublon_N` les numéros qui entrent en collision au
 * sein d'un même document, pour satisfaire la contrainte d'unicité en base.
 * Ces collisions sont presque toujours des actes distincts réunis dans un même
 * document, pas de vraies duplications — le suffixe est un artefact technique
 * de stockage, pas un numéro juridique. Reste dans la donnée et dans les URL
 * (il identifie l'article) ; seul l'affichage est nettoyé. Même correctif que
 * `mibeko-site/src/lib/sanitize.ts` (`displayArticleNumber`), appliqué ici
 * côté éditeur.
 */
export function displayArticleNumber(numero: string | null | undefined): string {
  return (numero ?? '').replace(/_doublon_\d+$/, '');
}

/**
 * Libellé lisible d'une feuille de contenu juridique.
 *
 * Certaines feuilles portent un `numero` technique plutôt qu'un vrai numéro
 * d'article : le préambule d'un acte (qualité du signataire, visas « Vu … »,
 * considérants), la formule finale (« Fait à … » + signataire), les tableaux,
 * les dispositions sans numéro d'article et les notes.
 * On évite ainsi d'afficher « Article PREAMBULE » ou « Article DISPOSITION_1 ».
 *
 * @param numero  Le `numero` du nœud (ex. « 1er », « PREAMBULE », « DISPOSITION_2 »).
 * @param options `short` pour la forme abrégée (table des matières) : « Art. 1er ».
 */
export function articleLeafLabel(
  numero: string | null | undefined,
  options: { short?: boolean } = {},
): string {
  const value = displayArticleNumber(numero).trim();

  if (value === 'PREAMBULE') {
    return 'Préambule';
  }

  if (value === 'SIGNATURE') {
    return 'Signature';
  }

  const table = /^TABLEAU_(\d+)$/.exec(value);
  if (table) {
    return options.short ? `Tab. ${table[1]}` : `Tableau ${table[1]}`;
  }

  const disposition = /^DISPOSITION_(\d+)$/.exec(value);
  if (disposition) {
    return options.short ? `Disp. ${disposition[1]}` : `Disposition ${disposition[1]}`;
  }

  const note = /^NOTE_(\d+)$/.exec(value);
  if (note) {
    return `Note ${note[1]}`;
  }

  return options.short ? `Art. ${value}` : `Article ${value}`;
}

/**
 * Intitulé d'un document tel qu'affiché sur UNE seule ligne (liste, résultat de
 * recherche, fil d'Ariane).
 *
 * Le Journal officiel publie certaines décisions en « actes en abrégé » : son
 * sommaire n'annonce que « Nomination. » et l'en-tête n'imprime aucun objet.
 * L'intitulé du texte est alors littéralement « Décret n° 2025-240 du 20 juin
 * 2025. » — fidèle à la source (vérifié le 16/08/2026 contre les markdowns
 * MinerU), et parfaitement muet. `libelle_descriptif` porte l'objet DÉRIVÉ du
 * corps de l'acte pour compenser ce silence.
 *
 * RÈGLE À NE PAS DÉFAIRE : le libellé descriptif n'est PAS le titre officiel.
 * Cette fonction les concatène, elle ne substitue jamais l'un à l'autre — un
 * client qui n'afficherait que le libellé présenterait comme intitulé officiel
 * une paraphrase qui n'en est pas un.
 */
export function documentLineLabel(
  titreOfficiel: string | null | undefined,
  libelleDescriptif?: string | null,
): string {
  const titre = (titreOfficiel ?? '').trim();
  const libelle = (libelleDescriptif ?? '').trim();

  if (titre === '') {
    return libelle || 'Document';
  }

  if (libelle === '') {
    return titre;
  }

  // Le point final de « … du 20 juin 2025. » ferait une coupure bancale devant
  // le tiret : on le retire de l'AFFICHAGE seulement, jamais de la donnée.
  return `${titre.replace(/\s*[.,;]\s*$/, '')} — ${libelle}`;
}

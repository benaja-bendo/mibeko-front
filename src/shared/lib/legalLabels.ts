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
 * considérants), la formule finale (« Fait à … » + signataire) et les tableaux.
 * On évite ainsi d'afficher « Article PREAMBULE » ou « Article TABLEAU_1 ».
 *
 * @param numero  Le `numero` du nœud (ex. « 1er », « PREAMBULE », « TABLEAU_2 »).
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

  return options.short ? `Art. ${value}` : `Article ${value}`;
}

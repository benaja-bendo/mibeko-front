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
  const value = (numero ?? '').trim();

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

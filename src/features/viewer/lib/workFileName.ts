/**
 * Nom de fichier lisible. Le titre officiel d'un acte dépasse couramment 150
 * caractères et porte des accents : les remplacer par des `_` produisait
 * « arr_t__n__2055_du_18_juillet… », illisible et interminable. On translittère
 * plutôt les accents, on réduit les séparateurs et on tronque sur un mot.
 */
export function workFileName(title: string | undefined): string {
  const base = (title || 'document')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const court = base.length <= 60 ? base : base.slice(0, 60).replace(/-[^-]*$/, '');

  return `${court || 'document'}_dossier-de-travail.json`;
}

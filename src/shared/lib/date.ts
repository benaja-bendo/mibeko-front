/**
 * Formatage de dates pour l'affichage.
 *
 * Gère aussi bien une date nue (« 2015-10-25 ») qu'un timestamp ISO complet
 * (« 2015-10-25T00:00:00+00:00 ») renvoyé par Laravel/Carbon. On lit les
 * composantes Y-M-D telles quelles pour éviter tout décalage de fuseau
 * (un `new Date('2015-10-25T00:00:00Z')` peut basculer d'un jour selon le tz).
 */
export function formatDate(value?: string | null): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) {
    const [, y, mo, d] = m;
    return `${d}/${mo}/${y}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('fr-FR');
}

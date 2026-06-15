/**
 * Formatage compact des nombres pour l'UI (style « réseaux sociaux »).
 *
 * En dessous de 1000 : nombre complet (groupé fr-FR). À partir de 1000 :
 * notation compacte localisée — 1 200 → « 1,2 k », 1 000 000 → « 1 M ».
 * À utiliser partout où un compteur peut grossir (cartes, stats, badges…).
 */
export function formatCompactNumber(value: number | null | undefined): string {
  const n = value ?? 0;
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) < 1000) return n.toLocaleString('fr-FR');
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

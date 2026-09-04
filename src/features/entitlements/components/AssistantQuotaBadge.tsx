/**
 * AssistantQuotaBadge — indicateur discret du quota assistant restant.
 *
 * Scopé à la page Assistant (mibeko-front#7). L'indicateur permanent,
 * visible dans toute la coquille de l'application, est le périmètre distinct
 * de mibeko-front#8 — ne pas l'anticiper ici.
 */
export default function AssistantQuotaBadge({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  const remaining = Math.max(0, limit - used);

  return (
    <span className="hidden shrink-0 rounded-full border border-b1 bg-s2 px-2.5 py-1 text-[11px] font-mono text-t2 sm:inline-flex">
      {remaining} question{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
    </span>
  );
}

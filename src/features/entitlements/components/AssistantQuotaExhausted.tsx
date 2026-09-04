import { useNavigate } from 'react-router-dom';

/**
 * AssistantQuotaExhausted — remplace le composer quand le quota assistant
 * est épuisé (mibeko-front#7, troisième état : « hors de votre offre »).
 *
 * Ne remplace QUE le composer : l'historique, la barre latérale et l'entrée
 * de menu restent visibles — « ce qui n'est pas découvert ne se vend pas »
 * (loi 2 de la charte du site, transposée au dashboard).
 */
export default function AssistantQuotaExhausted({
  resetsAt,
}: {
  resetsAt: string | null;
}) {
  const navigate = useNavigate();

  const resetsLabel = resetsAt
    ? new Date(resetsAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })
    : null;

  return (
    <div className="border-t border-b1 bg-s1/80 px-4 py-5">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-t1">
          Vous avez atteint votre quota de questions.
        </p>
        <p className="text-xs text-t3">
          {resetsLabel
            ? `Il se renouvelle le ${resetsLabel}.`
            : 'Il se renouvelle prochainement.'}{' '}
          Passez à Mibeko Pro pour un quota plus large et les outils métier
          (dossiers, échéances, export).
        </p>
        <button
          type="button"
          onClick={() => navigate('/app/upgrade')}
          className="mt-1 inline-flex h-9 items-center justify-center rounded-lg bg-gold px-4 text-sm font-semibold text-on-gold transition-opacity hover:opacity-90"
        >
          Découvrir Mibeko Pro
        </button>
      </div>
    </div>
  );
}

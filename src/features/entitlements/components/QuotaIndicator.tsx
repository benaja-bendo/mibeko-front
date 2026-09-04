import { Sparkles } from 'lucide-react';
import { useEntitlements } from '@/features/entitlements/hooks/useEntitlements';

/**
 * QuotaIndicator — indicateur discret et permanent du quota assistant
 * (mibeko-front#8).
 *
 * Vit dans la coquille de l'application (`Sidebar`), pas dans une page
 * précise : le seul signal auparavant était un 429 au pire moment, sans
 * préavis. Lu depuis `/me/entitlements`, jamais recalculé localement — pas
 * même la période (« ce mois-ci » vs « aujourd'hui ») : le palier user_pro
 * se renouvelle par jour, le palier standard par mois glissant, et
 * l'API n'expose pas cette distinction ici. D'où un texte qui ne nomme
 * jamais la période.
 *
 * Remplace l'ancien badge scopé à la seule page Assistant
 * (`AssistantQuotaBadge`, mibeko-front#7) : le même indicateur affiché deux
 * fois sur une même page aurait reproduit la répétition déjà corrigée sur
 * le Tableau de bord/Assistant/Bibliothèque.
 */
export default function QuotaIndicator() {
  const { data: entitlements } = useEntitlements();
  const quota = entitlements?.quotas.assistant;

  if (!quota) return null;

  const remaining = Math.max(0, quota.limit - quota.used);

  return (
    <div className="mx-2 mb-2 flex items-center gap-2 rounded-md border border-b1 bg-s2/60 px-3 py-2 text-xs text-t3">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold" />
      <span>
        <span className="font-medium text-t2">{remaining}</span> question
        {remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
      </span>
    </div>
  );
}

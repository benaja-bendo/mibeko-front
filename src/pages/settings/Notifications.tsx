import SettingsLayout from './SettingsLayout';
import { NotificationsCard, useAccount } from '@/features/settings';

/**
 * Page « Notifications » : matrice canal × type + fréquence de regroupement.
 *
 * Réutilise le chargement du compte (les préférences y sont incluses) et gère les
 * états chargement / erreur.
 */
export default function Notifications() {
  const { data: account, isLoading, isError, error, refetch } = useAccount();

  return (
    <SettingsLayout
      title="Notifications"
      description="Maîtrisez les canaux et les types d'alertes que vous recevez."
    >
      {isLoading && <p className="text-sm text-t3">Chargement…</p>}

      {isError && (
        <div className="bg-s1 border border-red/20 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm text-red">{error.message}</p>
          <button type="button" onClick={() => refetch()} className="text-xs text-gold hover:underline">
            Réessayer
          </button>
        </div>
      )}

      {account && <NotificationsCard preferences={account.settings.notification_preferences} />}
    </SettingsLayout>
  );
}

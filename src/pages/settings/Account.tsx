import SettingsLayout from './SettingsLayout';
import {
  AppearanceCard,
  IdentityCard,
  OrganisationCard,
  PasswordCard,
  PreferencesCard,
  PrivacyCard,
  SessionsCard,
  TwoFactorCard,
  useAccount,
} from '@/features/settings';

/** Titre de groupe de sections (sobre, mono). */
function GroupTitle({ children }: { children: string }) {
  return (
    <h3 className="text-[10px] font-mono uppercase tracking-widest text-t4 pt-2">{children}</h3>
  );
}

/**
 * Page « Compte » : identité, rôle/accès, préférences, sécurité (mot de passe,
 * 2FA, sessions) et confidentialité (RGPD).
 *
 * Gère explicitement les états de chargement et d'erreur du chargement du compte.
 */
export default function Account() {
  const { data: account, isLoading, isError, error, refetch } = useAccount();

  return (
    <SettingsLayout title="Compte" description="Vos informations, vos préférences et la sécurité de votre compte.">
      {isLoading && <p className="text-sm text-t3">Chargement de votre compte…</p>}

      {isError && (
        <div className="bg-s1 border border-red/20 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm text-red">{error.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs text-gold hover:underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {account && (
        <div className="space-y-6">
          <GroupTitle>Profil</GroupTitle>
          <IdentityCard account={account} />
          <OrganisationCard account={account} />

          <GroupTitle>Préférences</GroupTitle>
          <AppearanceCard settings={account.settings} />
          <PreferencesCard settings={account.settings} />

          <GroupTitle>Sécurité</GroupTitle>
          <PasswordCard />
          <TwoFactorCard />
          <SessionsCard />

          <GroupTitle>Confidentialité</GroupTitle>
          <PrivacyCard consents={account.settings.consents} />
        </div>
      )}
    </SettingsLayout>
  );
}

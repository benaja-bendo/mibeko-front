import { SettingsCard } from './SettingsCard';
import type { AccountProfile } from '@/features/settings/types';

interface OrganisationCardProps {
  account: AccountProfile;
}

/** Libellés lisibles pour les rôles techniques RBAC. */
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  editor: 'Éditeur',
  user_pro: 'Utilisateur Pro',
  mobile_user: 'Utilisateur mobile',
};

/**
 * Rôle et permissions de l'utilisateur, en lecture seule.
 *
 * Les droits ne sont pas modifiables depuis le profil : ils sont gérés par un
 * administrateur. On affiche un nombre limité de permissions pour rester lisible.
 */
export function OrganisationCard({ account }: OrganisationCardProps) {
  const visiblePermissions = account.permissions.slice(0, 12);
  const remaining = account.permissions.length - visiblePermissions.length;

  return (
    <SettingsCard
      title="Rôle & accès"
      description="Vos droits sont gérés par un administrateur et ne sont pas modifiables ici."
    >
      <div className="space-y-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-t3 mb-2">Rôles</div>
          <div className="flex flex-wrap gap-2">
            {account.roles.length === 0 && <span className="text-sm text-t3">Aucun rôle attribué.</span>}
            {account.roles.map((role) => (
              <span
                key={role}
                className="px-2.5 py-1 rounded-md bg-gold/10 border border-gold/20 text-gold text-xs font-medium"
              >
                {ROLE_LABELS[role] ?? role}
              </span>
            ))}
          </div>
        </div>

        {account.permissions.length > 0 && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-t3 mb-2">Permissions</div>
            <div className="flex flex-wrap gap-1.5">
              {visiblePermissions.map((permission) => (
                <span
                  key={permission}
                  className="px-2 py-0.5 rounded bg-s2 border border-b1 text-t2 text-[11px] font-mono"
                >
                  {permission}
                </span>
              ))}
              {remaining > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-mono text-t3">+{remaining}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}

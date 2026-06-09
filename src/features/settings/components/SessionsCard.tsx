import { Monitor, LogOut } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { SettingsCard } from './SettingsCard';
import { Feedback } from './Feedback';
import {
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
} from '@/features/settings/hooks/useSettings';
import type { SessionItem } from '@/features/settings/types';

/** Formate une date ISO en libellé court FR, ou « jamais » si nulle. */
function formatDate(iso: string | null): string {
  if (!iso) return 'jamais';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Sessions actives (un jeton = un appareil/navigateur).
 *
 * Gère les états chargement / vide / erreur, marque la session courante et permet
 * la révocation individuelle ou de toutes les autres sessions.
 */
export function SessionsCard() {
  const { data: sessions, isLoading, isError, error } = useSessions();
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();

  const hasOthers = (sessions ?? []).some((s) => !s.is_current);

  return (
    <SettingsCard
      title="Sessions actives"
      description="Appareils et navigateurs actuellement connectés à votre compte."
      action={
        hasOthers ? (
          <Button
            variant="outline"
            size="sm"
            disabled={revokeOthers.isPending}
            onClick={() => revokeOthers.mutate()}
          >
            Déconnecter les autres
          </Button>
        ) : null
      }
    >
      {isLoading && <p className="text-sm text-t3">Chargement des sessions…</p>}

      {isError && <Feedback kind="error" message={error.message} />}

      {!isLoading && !isError && (sessions?.length ?? 0) === 0 && (
        <p className="text-sm text-t3">Aucune session active.</p>
      )}

      <ul className="divide-y divide-b1">
        {sessions?.map((session: SessionItem) => (
          <li key={session.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="w-9 h-9 rounded-md bg-s2 border border-b1 flex items-center justify-center text-t2 shrink-0">
              <Monitor className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-t1 truncate">{session.name}</span>
                {session.is_current && (
                  <span className="px-1.5 py-0.5 rounded bg-green-d border border-green/20 text-green text-[10px] font-medium">
                    Session actuelle
                  </span>
                )}
              </div>
              <p className="text-xs text-t3 mt-0.5">
                Dernière activité : {formatDate(session.last_used_at)}
              </p>
            </div>
            {!session.is_current && (
              <button
                type="button"
                title="Révoquer cette session"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(session.id)}
                className="p-2 text-t3 hover:text-red transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </SettingsCard>
  );
}

import { Link } from 'react-router-dom';
import { FileText, Tag, Loader2, X } from 'lucide-react';
import SettingsLayout from './SettingsLayout';
import { SettingsCard } from '@/features/settings';
import { useWatches, useRemoveWatch } from '@/features/watches/hooks/useWatches';
import type { WatchedDocument, WatchedTheme, WatchSubscription } from '@/features/watches/types';

/**
 * Page « Veille légale » : liste des textes et thèmes suivis, avec
 * désinscription (mibeko-dashboard#125). Les alertes elles-mêmes (canal,
 * fréquence) se règlent dans Notifications — cette page ne gère QUE la
 * liste des cibles suivies.
 */
export default function Watches() {
  const { data, isLoading, isError, error, refetch } = useWatches();
  const remove = useRemoveWatch();

  const documents = (data ?? []).filter((w): w is WatchSubscription & { watchable: WatchedDocument } => w.watchableType === 'document');
  const themes = (data ?? []).filter((w): w is WatchSubscription & { watchable: WatchedTheme } => w.watchableType === 'theme');

  return (
    <SettingsLayout
      title="Veille légale"
      description="Les textes et thèmes que vous suivez vous alertent en cas de changement pertinent et publié."
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

      {data && (
        <>
          <SettingsCard
            title="Textes suivis"
            description="Alerte à chaque modification ou abrogation confirmée et publiée."
          >
            {documents.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-5 w-5 text-t3" />}
                text="Aucun texte suivi. Le bouton « Suivre » apparaît sur la page de lecture d'un texte."
              />
            ) : (
              <ul className="space-y-1.5">
                {documents.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-b1 bg-s2/40 px-3 py-2"
                  >
                    <Link
                      to={`/app/library?doc=${w.watchable.id}`}
                      className="min-w-0 flex-1 truncate text-sm text-t1 hover:text-gold"
                    >
                      {w.watchable.titre_officiel || 'Document'}
                    </Link>
                    <RemoveButton id={w.id} pending={remove.isPending} onRemove={() => remove.mutate(w.id)} />
                  </li>
                ))}
              </ul>
            )}
          </SettingsCard>

          <SettingsCard
            title="Thèmes suivis"
            description="Alerte à chaque nouveau texte publié dans ce thème."
          >
            {themes.length === 0 ? (
              <EmptyState
                icon={<Tag className="h-5 w-5 text-t3" />}
                text="Aucun thème suivi. Le bouton « Suivre » apparaît en parcourant les thèmes de la Bibliothèque."
              />
            ) : (
              <ul className="space-y-1.5">
                {themes.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-b1 bg-s2/40 px-3 py-2"
                  >
                    <Link
                      to={`/app/library?theme=${w.watchable.slug}`}
                      className="min-w-0 flex-1 truncate text-sm text-t1 hover:text-gold"
                    >
                      {w.watchable.name}
                    </Link>
                    <RemoveButton id={w.id} pending={remove.isPending} onRemove={() => remove.mutate(w.id)} />
                  </li>
                ))}
              </ul>
            )}
          </SettingsCard>
        </>
      )}
    </SettingsLayout>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-s2">{icon}</span>
      <p className="max-w-xs text-xs text-t3">{text}</p>
    </div>
  );
}

function RemoveButton({
  pending,
  onRemove,
}: {
  id: string;
  pending: boolean;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={pending}
      title="Ne plus suivre"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-t3 transition-colors hover:bg-red-d hover:text-red disabled:opacity-40"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
    </button>
  );
}

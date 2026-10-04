import { useEffect, useState, type ReactNode } from 'react';
import { useRouteError } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { MibekoLogo } from '@/shared/components/ui/MibekoLogo';
import { isChunkLoadError, reloadForNewBuild } from '@/shared/lib/chunkReload';

/**
 * Frontière d'erreur commune à toutes les routes (mibeko-front#68). Sans elle,
 * React Router affiche son écran de développement, en anglais.
 *
 * Un module de page introuvable vient d'un déploiement survenu pendant que
 * l'onglet était ouvert : on recharge une fois, et la page demandée s'ouvre
 * sur le nouveau build. Si ce rechargement est refusé, ou pour toute autre
 * erreur, l'écran reste affiché avec une issue et le message technique, qui
 * rend exploitable une capture envoyée au support.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  const staleBuild = isChunkLoadError(error);
  const [reloading, setReloading] = useState(staleBuild);

  useEffect(() => {
    if (staleBuild && !reloadForNewBuild()) setReloading(false);
  }, [staleBuild]);

  if (reloading) {
    return (
      <ErrorShell title="Nouvelle version de Mibeko">
        <p className="text-t3 text-sm">Mibeko vient d'être mis à jour. Rechargement de la page…</p>
      </ErrorShell>
    );
  }

  return (
    <ErrorShell title={staleBuild ? 'Page indisponible' : 'Une erreur est survenue'}>
      <p className="text-t3 text-sm">
        {staleBuild
          ? "Cette page n'a pas pu être chargée. Vérifiez votre connexion, puis rechargez la page."
          : "Cette page n'a pas pu s'afficher. Rechargez-la ; si l'erreur revient, repartez de l'accueil."}
      </p>
      {error instanceof Error && (
        <p className="font-mono text-xs text-t3 break-all">{error.message}</p>
      )}
      <div className="flex flex-col gap-2">
        <Button variant="gold" onClick={() => window.location.reload()}>
          Recharger la page
        </Button>
        {!staleBuild && (
          // Navigation complète plutôt que <Link> : on repart d'un état mémoire
          // vierge, qui peut être la cause de l'erreur.
          <Button variant="outline" onClick={() => window.location.assign('/')}>
            Retour à l'accueil
          </Button>
        )}
      </div>
    </ErrorShell>
  );
}

function ErrorShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
            <MibekoLogo size={48} alt="" />
          </div>
          <div className="text-t1 font-display text-xl font-semibold leading-tight">Mibeko</div>
        </div>

        <div role="alert" className="bg-s1 border border-b1 rounded-xl p-6 space-y-4">
          <h1 className="text-t1 font-display text-lg font-semibold">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

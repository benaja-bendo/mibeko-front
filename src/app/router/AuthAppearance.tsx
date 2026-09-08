import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { ensureThemeFontsLoaded, themeToCssVars } from '@/app/themes';
import { mibekoClassic } from '@/app/themes/mibeko-classic';

const authThemeStyle = {
  ...themeToCssVars(mibekoClassic),
  colorScheme: mibekoClassic.mode,
} as CSSProperties;

/**
 * Aligne les routes d'authentification sur l'identité claire du site public,
 * sans modifier ni persister le thème choisi pour l'espace de travail.
 *
 * Les variables restent limitées à ce sous-arbre : une fois connecté, le
 * thème personnel reprend donc immédiatement ses droits.
 */
export function AuthAppearance({ children }: { children: ReactNode }) {
  useEffect(() => {
    ensureThemeFontsLoaded(mibekoClassic);
  }, []);

  return (
    <div className="min-h-screen bg-bg font-body text-t1" style={authThemeStyle}>
      {children}
    </div>
  );
}

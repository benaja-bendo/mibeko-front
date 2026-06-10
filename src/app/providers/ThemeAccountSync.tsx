/**
 * ThemeAccountSync.tsx — Aligne le thème de l'appareil sur la préférence du
 * compte connecté (`user_settings.theme`).
 *
 * Le thème local (localStorage) s'applique immédiatement au boot (anti-flash) ;
 * dès que le compte est chargé, la préférence serveur prend le dessus si elle
 * diffère — c'est elle la source de vérité multi-appareils.
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getAccount } from '@/features/settings/api/settingsApi';
import { settingsKeys } from '@/features/settings/hooks/useSettings';
import { useThemeStore } from '@/app/themes/themeStore';

export function ThemeAccountSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setTheme = useThemeStore((s) => s.setTheme);

  const { data: account } = useQuery({
    queryKey: settingsKeys.account(),
    queryFn: getAccount,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const serverTheme = account?.settings?.theme;

  useEffect(() => {
    if (serverTheme && serverTheme !== useThemeStore.getState().themeId) {
      setTheme(serverTheme);
    }
  }, [serverTheme, setTheme]);

  return null;
}

import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { SettingsCard } from './SettingsCard';
import { Feedback } from './Feedback';
import { useUpdatePreferences } from '@/features/settings/hooks/useSettings';
import { THEMES } from '@/app/themes';
import { useThemeStore } from '@/app/themes/themeStore';
import type { AccountSettings } from '@/features/settings/types';

interface AppearanceCardProps {
  settings: AccountSettings;
}

/**
 * Permet à l'utilisateur de choisir le thème visuel de l'application.
 */
export function AppearanceCard({ settings }: AppearanceCardProps) {
  const update = useUpdatePreferences();
  const activeThemeId = useThemeStore((s) => s.themeId);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [done, setDone] = useState(false);

  // L'utilisateur peut prévisualiser un thème avant de l'enregistrer
  const dirty = activeThemeId !== (settings.theme || 'lex-gold');

  function handleThemeChange(themeId: string) {
    setTheme(themeId);
    setDone(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDone(false);
    update.mutate(
      { theme: activeThemeId },
      { onSuccess: () => setDone(true) }
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <SettingsCard
        title="Apparence"
        description="Choisissez le thème visuel de l'application. Cette préférence est synchronisée sur tous vos appareils."
        footer={
          <>
            {done && !update.isPending && <Feedback kind="success" message="Thème enregistré." />}
            {update.isError && <Feedback kind="error" message={update.error.message} />}
            <Button type="submit" variant="gold" size="sm" disabled={!dirty || update.isPending}>
              {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {THEMES.map((theme) => {
            const isActive = activeThemeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleThemeChange(theme.id)}
                className={[
                  'flex flex-col text-left p-4 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gold/50',
                  isActive
                    ? 'border-gold bg-gold/5 ring-1 ring-gold/20'
                    : 'border-b1 bg-s1 hover:border-b2',
                ].join(' ')}
              >
                {/* Preview visuelle */}
                <div
                  className="w-full h-24 rounded-lg mb-4 border flex items-center justify-center shadow-sm overflow-hidden"
                  style={{
                    backgroundColor: theme.preview.bg,
                    borderColor: theme.preview.border,
                  }}
                >
                  <div
                    className="w-3/4 h-16 rounded shadow-sm border p-2 flex flex-col gap-2"
                    style={{
                      backgroundColor: theme.preview.surface,
                      borderColor: theme.preview.border,
                    }}
                  >
                    <div
                      className="w-1/3 h-2 rounded-full"
                      style={{ backgroundColor: theme.preview.text, opacity: 0.8 }}
                    />
                    <div
                      className="w-full h-2 rounded-full"
                      style={{ backgroundColor: theme.preview.text, opacity: 0.4 }}
                    />
                    <div className="mt-auto flex justify-end">
                      <div
                        className="w-8 h-3 rounded"
                        style={{ backgroundColor: theme.preview.accent }}
                      />
                    </div>
                  </div>
                </div>

                <h4 className="text-sm font-semibold text-t1">{theme.name}</h4>
                <p className="text-xs text-t3 mt-1 leading-relaxed">
                  {theme.description}
                </p>
              </button>
            );
          })}
        </div>
      </SettingsCard>
    </form>
  );
}

import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Label } from '@/shared/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/Select';
import { SettingsCard } from './SettingsCard';
import { Feedback } from './Feedback';
import { useUpdatePreferences } from '@/features/settings/hooks/useSettings';
import type { AccountSettings, Locale } from '@/features/settings/types';

interface PreferencesCardProps {
  settings: AccountSettings;
}

/** Fuseaux proposés : Congo-Brazzaville en priorité, puis quelques fuseaux courants
 *  (Kinshasa/Lubumbashi restent proposés pour les valeurs déjà enregistrées). */
const TIMEZONES = [
  'Africa/Brazzaville',
  'Africa/Kinshasa',
  'Africa/Lubumbashi',
  'Europe/Paris',
  'Europe/Brussels',
  'UTC',
];

/** Formats de date proposés avec un exemple rendu. */
const DATE_FORMATS: { value: string; label: string }[] = [
  { value: 'd/m/Y', label: '31/12/2026' },
  { value: 'Y-m-d', label: '2026-12-31' },
  { value: 'd M Y', label: '31 déc. 2026' },
];

/**
 * Préférences d'affichage : langue de l'interface, fuseau horaire et format de date.
 */
export function PreferencesCard({ settings }: PreferencesCardProps) {
  const update = useUpdatePreferences();
  const [locale, setLocale] = useState<Locale>(settings.locale);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [dateFormat, setDateFormat] = useState(settings.date_format);
  const [done, setDone] = useState(false);

  const dirty =
    locale !== settings.locale ||
    timezone !== settings.timezone ||
    dateFormat !== settings.date_format;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDone(false);
    update.mutate(
      { locale, timezone, date_format: dateFormat },
      { onSuccess: () => setDone(true) },
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <SettingsCard
        title="Préférences d'affichage"
        description="Langue, fuseau horaire et format de date utilisés dans l'application."
        footer={
          <>
            {done && !update.isPending && <Feedback kind="success" message="Préférences enregistrées." />}
            {update.isError && <Feedback kind="error" message={update.error.message} />}
            <Button type="submit" variant="gold" size="sm" disabled={!dirty || update.isPending}>
              {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Langue</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Fuseau horaire</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Format de date</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsCard>
    </form>
  );
}

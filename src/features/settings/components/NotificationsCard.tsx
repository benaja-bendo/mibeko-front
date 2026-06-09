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
import { Switch } from './Switch';
import { Feedback } from './Feedback';
import { useUpdateNotificationPreferences } from '@/features/settings/hooks/useSettings';
import {
  NOTIFICATION_TYPES,
  type NotificationChannel,
  type NotificationFrequency,
  type NotificationMatrix,
  type NotificationType,
} from '@/features/settings/types';

interface NotificationsCardProps {
  preferences: NotificationMatrix;
}

/** Libellés lisibles des types de notification. */
const TYPE_LABELS: Record<NotificationType, { label: string; description: string }> = {
  extraction_update: { label: "Mises à jour d'extraction", description: 'Avancement du traitement de vos documents.' },
  new_document: { label: 'Nouveaux documents', description: 'Publication de nouveaux textes juridiques.' },
  share: { label: 'Partages', description: 'Quand un dossier ou document vous est partagé.' },
  legal_alert: { label: 'Alertes légales', description: 'Échéances et nouveautés réglementaires.' },
  system: { label: 'Système & sécurité', description: 'Connexions, sécurité et messages importants.' },
};

const CHANNELS: { key: NotificationChannel; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'push', label: 'Push' },
  { key: 'in_app', label: 'In-app' },
];

const FREQUENCIES: { value: NotificationFrequency; label: string }[] = [
  { value: 'instant', label: 'Instantané' },
  { value: 'daily', label: 'Résumé quotidien' },
  { value: 'weekly', label: 'Résumé hebdomadaire' },
];

/**
 * Matrice de préférences de notification : pour chaque type, activation par canal
 * (email / push / in-app) ; plus une fréquence de regroupement des emails.
 *
 * L'état est piloté localement puis envoyé en une fois (remplacement complet de la
 * matrice côté serveur).
 */
export function NotificationsCard({ preferences }: NotificationsCardProps) {
  const update = useUpdateNotificationPreferences();
  const [matrix, setMatrix] = useState<NotificationMatrix>(preferences);
  const [done, setDone] = useState(false);

  const dirty = JSON.stringify(matrix) !== JSON.stringify(preferences);

  function toggle(type: NotificationType, channel: NotificationChannel) {
    setMatrix((prev) => ({
      ...prev,
      [type]: { ...prev[type], [channel]: !prev[type][channel] },
    }));
  }

  function setFrequency(frequency: NotificationFrequency) {
    setMatrix((prev) => ({ ...prev, _frequency: frequency }));
  }

  function handleSave() {
    setDone(false);
    update.mutate(matrix, { onSuccess: () => setDone(true) });
  }

  return (
    <SettingsCard
      title="Préférences de notification"
      description="Choisissez comment et pour quels événements vous souhaitez être notifié."
      footer={
        <>
          {done && !update.isPending && <Feedback kind="success" message="Préférences enregistrées." />}
          {update.isError && <Feedback kind="error" message={update.error.message} />}
          <Button variant="gold" size="sm" disabled={!dirty || update.isPending} onClick={handleSave}>
            {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      {/* En-tête de colonnes (desktop) */}
      <div className="hidden md:grid grid-cols-[1fr_repeat(3,72px)] gap-2 pb-2 border-b border-b1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-t3">Type</span>
        {CHANNELS.map((c) => (
          <span key={c.key} className="text-[10px] font-mono uppercase tracking-wider text-t3 text-center">
            {c.label}
          </span>
        ))}
      </div>

      <div className="divide-y divide-b1">
        {NOTIFICATION_TYPES.map((type) => (
          <div
            key={type}
            className="grid grid-cols-2 md:grid-cols-[1fr_repeat(3,72px)] gap-2 py-3 items-center"
          >
            <div className="col-span-2 md:col-span-1">
              <div className="text-sm text-t1">{TYPE_LABELS[type].label}</div>
              <p className="text-xs text-t3 mt-0.5 leading-relaxed">{TYPE_LABELS[type].description}</p>
            </div>
            {CHANNELS.map((c) => (
              <div key={c.key} className="flex items-center md:justify-center gap-2">
                <span className="text-xs text-t3 md:hidden">{c.label}</span>
                <Switch
                  checked={matrix[type][c.key]}
                  onChange={() => toggle(type, c.key)}
                  aria-label={`${TYPE_LABELS[type].label} – ${c.label}`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Fréquence de regroupement */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-b1">
        <div>
          <Label>Fréquence des emails</Label>
          <p className="text-xs text-t3 mt-1">Regroupez les notifications email pour limiter leur volume.</p>
        </div>
        <Select value={matrix._frequency} onValueChange={(v) => setFrequency(v as NotificationFrequency)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </SettingsCard>
  );
}

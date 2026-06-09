import { useState } from 'react';
import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/Dialog';
import { SettingsCard } from './SettingsCard';
import { Switch } from './Switch';
import { Feedback } from './Feedback';
import { useAuthStore } from '@/features/auth/store/authStore';
import { exportPersonalData } from '@/features/settings/api/settingsApi';
import { useDeleteAccount, useUpdateConsents } from '@/features/settings/hooks/useSettings';
import type { AccountConsents } from '@/features/settings/types';

interface PrivacyCardProps {
  consents: AccountConsents;
}

/**
 * Conformité RGPD : consentements (opt-in/out), droit d'accès (export des données)
 * et droit à l'effacement (suppression du compte avec confirmation par mot de passe).
 */
export function PrivacyCard({ consents }: PrivacyCardProps) {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const updateConsents = useUpdateConsents();
  const deleteAccount = useDeleteAccount();

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  // Déclenche le téléchargement de l'export RGPD.
  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      await exportPersonalData();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export impossible.');
    } finally {
      setExporting(false);
    }
  }

  // Supprime le compte puis déconnecte et redirige vers la connexion.
  function handleDelete() {
    deleteAccount.mutate(password, {
      onSuccess: () => {
        clearAuth();
        navigate('/auth/login', { replace: true });
      },
    });
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Confidentialité & consentements"
        description="Gérez l'utilisation de vos données conformément au RGPD."
      >
        <div className="space-y-4">
          <ConsentRow
            label="Communications marketing"
            description="Recevoir des actualités produit et offres par email."
            checked={consents.marketing}
            disabled={updateConsents.isPending}
            onChange={(v) => updateConsents.mutate({ marketing: v })}
          />
          <ConsentRow
            label="Mesure d'audience"
            description="Autoriser des statistiques d'usage anonymisées pour améliorer le service."
            checked={consents.analytics}
            disabled={updateConsents.isPending}
            onChange={(v) => updateConsents.mutate({ analytics: v })}
          />
          {updateConsents.isError && <Feedback kind="error" message={updateConsents.error.message} />}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Vos données"
        description="Téléchargez une copie de vos données personnelles (droit d'accès)."
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-t2">Export au format JSON : compte, profil, préférences et notifications.</p>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-2 shrink-0">
            <Download className="w-4 h-4" />
            {exporting ? 'Préparation…' : 'Exporter'}
          </Button>
        </div>
        {exportError && <Feedback kind="error" message={exportError} className="mt-3" />}
      </SettingsCard>

      {/* Zone sensible : suppression de compte */}
      <section className="bg-s1 border border-red/20 rounded-xl overflow-hidden">
        <header className="px-5 py-4 border-b border-red/15">
          <h2 className="text-sm font-semibold text-red">Supprimer le compte</h2>
          <p className="text-xs text-t3 mt-1 leading-relaxed">
            Cette action est définitive. Vos données seront supprimées et vos sessions révoquées.
          </p>
        </header>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <p className="text-sm text-t2">Droit à l'effacement (RGPD).</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="danger" size="sm" className="shrink-0">
                Supprimer mon compte
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmer la suppression</DialogTitle>
                <DialogDescription>
                  Saisissez votre mot de passe pour confirmer la suppression définitive de votre compte.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="delete-pwd">Mot de passe</Label>
                <Input
                  id="delete-pwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {deleteAccount.isError && <Feedback kind="error" message={deleteAccount.error.message} />}
              <DialogFooter>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={!password || deleteAccount.isPending}
                  onClick={handleDelete}
                >
                  {deleteAccount.isPending ? 'Suppression…' : 'Supprimer définitivement'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}

interface ConsentRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** Ligne de consentement : libellé + description + interrupteur. */
function ConsentRow({ label, description, checked, disabled, onChange }: ConsentRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm text-t1">{label}</div>
        <p className="text-xs text-t3 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} aria-label={label} />
    </div>
  );
}

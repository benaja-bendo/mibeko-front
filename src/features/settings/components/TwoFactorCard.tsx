import { useState } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { SettingsCard } from './SettingsCard';
import { Feedback } from './Feedback';
import { RecoveryCodes } from './RecoveryCodes';
import {
  useConfirmTwoFactor,
  useDisableTwoFactor,
  useEnableTwoFactor,
  useRegenerateRecoveryCodes,
  useTwoFactor,
} from '@/features/settings/hooks/useSettings';
import type { TwoFactorSetup } from '@/features/settings/types';

/**
 * Gestion de la double authentification (2FA TOTP).
 *
 * Machine à états :
 *  - désactivé → saisie du mot de passe → QR + codes de récupération → confirmation TOTP
 *  - activé    → régénération des codes / désactivation (mot de passe requis)
 */
export function TwoFactorCard() {
  const { data: status, isLoading } = useTwoFactor();
  const enable = useEnableTwoFactor();
  const confirm = useConfirmTwoFactor();
  const disable = useDisableTwoFactor();
  const regenerate = useRegenerateRecoveryCodes();

  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);

  const enabled = status?.enabled && status?.confirmed;

  // ── Démarrage de l'activation ──────────────────────────────────────────────
  function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    enable.mutate(password, {
      onSuccess: (data) => {
        setSetup(data);
        setPassword('');
      },
    });
  }

  // ── Confirmation par code TOTP ─────────────────────────────────────────────
  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    confirm.mutate(code, {
      onSuccess: () => {
        setSetup(null);
        setCode('');
      },
    });
  }

  // ── Désactivation ──────────────────────────────────────────────────────────
  function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    disable.mutate(password, { onSuccess: () => setPassword('') });
  }

  // ── Régénération des codes de récupération ─────────────────────────────────
  function handleRegenerate(e: React.FormEvent) {
    e.preventDefault();
    regenerate.mutate(password, {
      onSuccess: (codes) => {
        setFreshCodes(codes);
        setPassword('');
      },
    });
  }

  const statusBadge = enabled ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-d border border-green/20 text-green text-xs font-medium">
      <ShieldCheck className="w-3.5 h-3.5" /> Activée
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-d border border-amber/20 text-amber text-xs font-medium">
      <ShieldAlert className="w-3.5 h-3.5" /> Désactivée
    </span>
  );

  return (
    <SettingsCard
      title="Double authentification (2FA)"
      description="Ajoutez une couche de sécurité avec une application d'authentification (TOTP)."
      action={!isLoading ? statusBadge : null}
    >
      {isLoading && <p className="text-sm text-t3">Chargement…</p>}

      {/* État activé : régénération / désactivation */}
      {!isLoading && enabled && !freshCodes && (
        <div className="space-y-4">
          <p className="text-sm text-t2">
            La double authentification protège votre compte. Vous disposez de{' '}
            <span className="text-t1 font-medium">{status?.recovery_codes_count ?? 0}</span> codes de récupération.
          </p>
          <form onSubmit={handleRegenerate} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="tf-pwd">Mot de passe actuel</Label>
              <Input
                id="tf-pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" size="sm" disabled={regenerate.isPending}>
                Régénérer les codes
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={disable.isPending || !password}
                onClick={handleDisable}
              >
                Désactiver
              </Button>
            </div>
          </form>
          {(disable.isError || regenerate.isError) && (
            <Feedback kind="error" message={(disable.error ?? regenerate.error)!.message} />
          )}
        </div>
      )}

      {/* Codes fraîchement régénérés */}
      {freshCodes && (
        <div className="space-y-4">
          <Feedback kind="success" message="Nouveaux codes générés. Les anciens ne sont plus valides." />
          <RecoveryCodes codes={freshCodes} />
          <Button variant="outline" size="sm" onClick={() => setFreshCodes(null)}>
            J'ai sauvegardé mes codes
          </Button>
        </div>
      )}

      {/* État désactivé, étape 1 : mot de passe → génération du secret */}
      {!isLoading && !enabled && !setup && (
        <form onSubmit={handleEnable} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="tf-enable-pwd">Mot de passe actuel</Label>
            <Input
              id="tf-enable-pwd"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" variant="gold" size="sm" disabled={enable.isPending || !password}>
            {enable.isPending ? 'Activation…' : 'Activer le 2FA'}
          </Button>
          {enable.isError && <Feedback kind="error" message={enable.error.message} />}
        </form>
      )}

      {/* État désactivé, étape 2 : QR + codes + confirmation TOTP */}
      {setup && (
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row gap-5">
            <div
              className="bg-white rounded-lg p-3 w-fit shrink-0 [&_svg]:w-40 [&_svg]:h-40"
              // SVG généré par notre propre backend (Fortify) → contenu de confiance.
              dangerouslySetInnerHTML={{ __html: setup.svg }}
            />
            <div className="space-y-3 flex-1">
              <p className="text-sm text-t2">
                Scannez ce QR code avec votre application d'authentification (Google Authenticator,
                Authy…), puis saisissez le code à 6 chiffres généré.
              </p>
              <RecoveryCodes
                codes={setup.recovery_codes}
                hint="Conservez ces codes de récupération en lieu sûr : ils permettent de vous connecter si vous perdez votre appareil."
              />
            </div>
          </div>

          <form onSubmit={handleConfirm} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-1.5 flex-1 max-w-[200px]">
              <Label htmlFor="tf-code">Code de vérification</Label>
              <Input
                id="tf-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="gold" size="sm" disabled={confirm.isPending || !code}>
                {confirm.isPending ? 'Vérification…' : 'Confirmer'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSetup(null)}>
                Annuler
              </Button>
            </div>
          </form>
          {confirm.isError && <Feedback kind="error" message={confirm.error.message} />}
        </div>
      )}
    </SettingsCard>
  );
}

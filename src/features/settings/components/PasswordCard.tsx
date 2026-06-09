import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { SettingsCard } from './SettingsCard';
import { Feedback } from './Feedback';
import { useUpdatePassword } from '@/features/settings/hooks/useSettings';

/**
 * Changement de mot de passe.
 *
 * Le serveur révoque les autres sessions après un changement réussi ; on le
 * rappelle à l'utilisateur. Validation locale minimale (longueur + confirmation)
 * en complément de la validation serveur.
 */
export function PasswordCard() {
  const update = useUpdatePassword();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function reset() {
    setCurrent('');
    setPassword('');
    setConfirm('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDone(false);
    setLocalError(null);

    if (password.length < 8) {
      setLocalError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setLocalError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    update.mutate(
      { current_password: current, password, password_confirmation: confirm },
      {
        onSuccess: () => {
          setDone(true);
          reset();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <SettingsCard
        title="Mot de passe"
        description="Pour votre sécurité, les autres sessions seront déconnectées après un changement."
        footer={
          <>
            {done && <Feedback kind="success" message="Mot de passe mis à jour." />}
            {localError && <Feedback kind="error" message={localError} />}
            {update.isError && <Feedback kind="error" message={update.error.message} />}
            <Button type="submit" variant="gold" size="sm" disabled={update.isPending}>
              {update.isPending ? 'Mise à jour…' : 'Mettre à jour'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="current_password">Mot de passe actuel</Label>
            <Input
              id="current_password"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new_password">Nouveau mot de passe</Label>
            <Input
              id="new_password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">Confirmation</Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        </div>
      </SettingsCard>
    </form>
  );
}

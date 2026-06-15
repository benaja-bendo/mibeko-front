import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { useUserMutations, useInvitationMutations } from '@/features/admin/hooks/useUsers';
import { ROLE_OPTIONS } from '@/features/admin/api/usersApi';
import { UserPlus, Mail, KeyRound, Copy, Check } from 'lucide-react';

type Mode = 'invite' | 'direct';

/** Ajout d'un utilisateur : invitation par email ou création directe. */
export default function UserFormModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { create: createUser } = useUserMutations();
  const { create: createInvite } = useInvitationMutations();

  const [mode, setMode] = React.useState<Mode>('invite');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [markVerified, setMarkVerified] = React.useState(true);
  const [roles, setRoles] = React.useState<string[]>(['editor']);
  const [generated, setGenerated] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMode('invite');
      setName('');
      setEmail('');
      setPassword('');
      setMarkVerified(true);
      setRoles(['editor']);
      setGenerated(null);
      setCopied(false);
      createUser.reset();
      createInvite.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleRole = (value: string) =>
    setRoles((prev) => (prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]));

  const pending = createUser.isPending || createInvite.isPending;
  const error = (createUser.error || createInvite.error) as Error | null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'invite') {
      createInvite.mutate(
        { email: email.trim(), roles },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createUser.mutate(
        {
          name: name.trim(),
          email: email.trim(),
          password: password.trim() || undefined,
          roles,
          mark_verified: markVerified,
        },
        {
          onSuccess: (data) => {
            if (data.generated_password) {
              setGenerated(data.generated_password);
            } else {
              onOpenChange(false);
            }
          },
        },
      );
    }
  };

  const copyPassword = () => {
    if (generated) {
      navigator.clipboard?.writeText(generated);
      setCopied(true);
    }
  };

  const canSubmit =
    email.trim().length > 0 && roles.length > 0 && (mode === 'invite' || name.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Ajouter un utilisateur
          </DialogTitle>
        </DialogHeader>

        {generated ? (
          <div className="space-y-4 py-2">
            <p className="text-t2 text-[13px]">
              Compte créé. Transmettez ce mot de passe provisoire à l'utilisateur — il ne sera plus
              affiché ensuite.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2.5">
              <KeyRound className="w-4 h-4 text-gold shrink-0" />
              <code className="flex-1 text-t1 text-[13px] font-mono break-all">{generated}</code>
              <button
                onClick={copyPassword}
                className="text-t3 hover:text-t1 transition-colors"
                title="Copier"
              >
                {copied ? <Check className="w-4 h-4 text-gold" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <DialogFooter>
              <Button variant="gold" onClick={() => onOpenChange(false)}>
                Terminé
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Bascule de mode */}
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: 'invite', label: 'Inviter par email', icon: Mail },
                  { key: 'direct', label: 'Créer directement', icon: KeyRound },
                ] as const
              ).map((opt) => {
                const active = mode === opt.key;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setMode(opt.key)}
                    className={[
                      'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
                      active ? 'bg-gold/10 border-gold/30 text-t1' : 'bg-s2 border-b1 text-t3 hover:text-t2',
                    ].join(' ')}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[12px] font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {mode === 'direct' && (
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Dupont" required />
              </div>
            )}

            <div className="space-y-2">
              <Label>Adresse email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jean@cabinet.cd"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Rôles</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((r) => {
                  const active = roles.includes(r.value);
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => toggleRole(r.value)}
                      className={[
                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                        active ? 'bg-gold/10 border-gold/30 text-t1' : 'bg-s2 border-b1 text-t3 hover:text-t2',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[9px]',
                          active ? 'bg-gold border-gold text-bg' : 'border-t4',
                        ].join(' ')}
                      >
                        {active ? '✓' : ''}
                      </span>
                      <span className="text-[12px] font-medium">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {mode === 'direct' && (
              <>
                <div className="space-y-2">
                  <Label>
                    Mot de passe{' '}
                    <span className="text-t4 font-mono text-[10px]">(laisser vide pour en générer un)</span>
                  </Label>
                  <Input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 caractères"
                  />
                </div>
                <label className="flex items-center gap-2 text-[12px] text-t2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markVerified}
                    onChange={(e) => setMarkVerified(e.target.checked)}
                    className="accent-gold"
                  />
                  Marquer l'email comme déjà vérifié
                </label>
              </>
            )}

            {mode === 'invite' && (
              <p className="text-t4 text-[11px]">
                Un email d'invitation sera envoyé. L'utilisateur définira lui-même son mot de passe.
              </p>
            )}

            {error && <p className="text-red text-[11px] font-mono">{error.message}</p>}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="gold" disabled={pending || !canSubmit}>
                {pending ? 'Envoi…' : mode === 'invite' ? "Envoyer l'invitation" : 'Créer le compte'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

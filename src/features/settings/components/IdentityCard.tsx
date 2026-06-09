import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { SettingsCard } from './SettingsCard';
import { Feedback } from './Feedback';
import { useUpdateProfile } from '@/features/settings/hooks/useSettings';
import type { AccountProfile } from '@/features/settings/types';

interface IdentityCardProps {
  account: AccountProfile;
}

/**
 * Formulaire des informations personnelles (nom, téléphone, fonction, organisation).
 *
 * L'email est en lecture seule : son changement relèverait d'un flux de
 * re-vérification dédié, non exposé sur cet écran.
 */
export function IdentityCard({ account }: IdentityCardProps) {
  const update = useUpdateProfile();
  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.profile.phone ?? '');
  const [profession, setProfession] = useState(account.profile.profession ?? '');
  const [company, setCompany] = useState(account.profile.company ?? '');
  const [done, setDone] = useState(false);

  // Active le bouton uniquement si un champ a réellement changé.
  const dirty =
    name !== account.name ||
    phone !== (account.profile.phone ?? '') ||
    profession !== (account.profile.profession ?? '') ||
    company !== (account.profile.company ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDone(false);
    update.mutate(
      { name: name.trim(), phone, profession, company },
      { onSuccess: () => setDone(true) },
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <SettingsCard
        title="Informations personnelles"
        description="Ces informations apparaissent dans votre espace et sur vos documents."
        footer={
          <>
            {done && !update.isPending && <Feedback kind="success" message="Profil enregistré." />}
            {update.isError && <Feedback kind="error" message={update.error.message} />}
            <Button type="submit" variant="gold" size="sm" disabled={!dirty || update.isPending}>
              {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom complet</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={account.email} disabled readOnly />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+243 …"
              maxLength={30}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profession">Fonction</Label>
            <Input
              id="profession"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder="Avocat, juriste…"
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="company">Organisation</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Cabinet, entreprise, institution…"
              maxLength={255}
            />
          </div>
        </div>
      </SettingsCard>
    </form>
  );
}

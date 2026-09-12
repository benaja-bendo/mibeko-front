import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/Select';
import { SettingsCard } from './SettingsCard';
import { Feedback } from './Feedback';
import { useUpdateProfile } from '@/features/settings/hooks/useSettings';
import { useThemes } from '@/features/library/hooks/useThemes';
import { usageContextLabel } from '@/shared/lib/labels';
import { USAGE_CONTEXTS } from '@/features/settings/types';
import type { AccountProfile, UpdateProfilePayload, UsageContext } from '@/features/settings/types';

interface IdentityCardProps {
  account: AccountProfile;
}

function sameInterests(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sorted = [...b].sort();
  return [...a].sort().every((slug, i) => slug === sorted[i]);
}

/**
 * Formulaire des informations personnelles (nom, téléphone, cadre d'usage,
 * métier, organisation, centres d'intérêt).
 *
 * L'email est en lecture seule : son changement relèverait d'un flux de
 * re-vérification dédié, non exposé sur cet écran.
 *
 * Envoi diffé (seules les clés changées) plutôt qu'un payload complet à
 * chaque soumission : le serveur applique un PATCH réellement partiel
 * (mibeko-dashboard#135, champ absent = inchangé) — resoumettre un téléphone
 * déjà stocké dans un format ancien ne doit pas faire échouer la sauvegarde
 * d'un autre champ modifié seul.
 */
export function IdentityCard({ account }: IdentityCardProps) {
  const update = useUpdateProfile();
  const themes = useThemes();
  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.profile.phone ?? '');
  const [usageContext, setUsageContext] = useState<UsageContext | ''>(account.profile.usage_context ?? '');
  const [jobTitle, setJobTitle] = useState(account.profile.job_title ?? '');
  const [company, setCompany] = useState(account.profile.company ?? '');
  const [interests, setInterests] = useState<string[]>(account.profile.interests);
  const [done, setDone] = useState(false);

  const dirty =
    name !== account.name ||
    phone !== (account.profile.phone ?? '') ||
    usageContext !== (account.profile.usage_context ?? '') ||
    jobTitle !== (account.profile.job_title ?? '') ||
    company !== (account.profile.company ?? '') ||
    !sameInterests(interests, account.profile.interests);

  function toggleInterest(slug: string) {
    setInterests((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDone(false);
    const payload: UpdateProfilePayload = {};
    if (name.trim() !== account.name) payload.name = name.trim();
    if (phone !== (account.profile.phone ?? '')) payload.phone = phone.trim() || null;
    if (usageContext !== (account.profile.usage_context ?? '')) payload.usage_context = usageContext || null;
    if (jobTitle !== (account.profile.job_title ?? '')) payload.job_title = jobTitle.trim() || null;
    if (company !== (account.profile.company ?? '')) payload.company = company.trim() || null;
    if (!sameInterests(interests, account.profile.interests)) payload.interests = interests;

    update.mutate(payload, { onSuccess: () => setDone(true) });
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
              placeholder="+242 …"
              maxLength={30}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cadre d'usage</Label>
            <Select value={usageContext} onValueChange={(v) => setUsageContext(v as UsageContext)}>
              <SelectTrigger>
                <SelectValue placeholder="Non renseigné" />
              </SelectTrigger>
              <SelectContent>
                {USAGE_CONTEXTS.map((code) => (
                  <SelectItem key={code} value={code}>
                    {usageContextLabel(code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job-title">Métier (facultatif)</Label>
            <Input
              id="job-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Avocat, juriste…"
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Organisation</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Cabinet, entreprise, institution…"
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Centres d'intérêt</Label>
            <div className="flex flex-wrap gap-2">
              {themes.data?.map((theme) => (
                <Button
                  key={theme.slug}
                  type="button"
                  size="sm"
                  variant={interests.includes(theme.slug) ? 'gold' : 'outline'}
                  onClick={() => toggleInterest(theme.slug)}
                  aria-pressed={interests.includes(theme.slug)}
                >
                  {theme.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </SettingsCard>
    </form>
  );
}

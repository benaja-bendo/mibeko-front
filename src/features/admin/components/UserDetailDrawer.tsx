import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/shared/components/ui/Sheet';
import { Button } from '@/shared/components/ui/Button';
import {
  useUser,
  useUserMutations,
  useImpersonate,
  useUserAiQuotaOverrideMutations,
} from '@/features/admin/hooks/useUsers';
import { Input } from '@/shared/components/ui/Input';
import { ROLE_LABELS, type AdminUserDetail } from '@/features/admin/api/usersApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import RolesPermissionsEditor from './RolesPermissionsEditor';
import SuspendDialog from './SuspendDialog';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import {
  ShieldCheck, ShieldOff, MailCheck, MailX, Ban, RotateCcw, KeyRound, LogIn, Trash2,
  Wifi, WifiOff, Lock, Unlock, Save, Clock, FolderOpen, MessagesSquare, Sparkles, Pencil, X,
} from 'lucide-react';

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
  pending: 'bg-gold/10 text-gold border-gold/20',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  pending: 'En attente',
};

function Fact({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="rounded-lg border border-b1 bg-s2 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-t4">{icon}{label}</div>
      <div className={['text-[13px] mt-0.5', tone === 'warn' ? 'text-red-400' : tone === 'ok' ? 'text-emerald-400' : 'text-t1'].join(' ')}>{value}</div>
    </div>
  );
}

export default function UserDetailDrawer({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { data, isLoading } = useUser(userId);
  const { update, remove, restore, passwordReset, revokeTokens, verifyEmail, disableTwoFactor } =
    useUserMutations(userId ?? undefined);
  const impersonate = useImpersonate();
  const startImpersonation = useAuthStore((s) => s.startImpersonation);

  const [roles, setRoles] = React.useState<string[]>([]);
  const [directPermissions, setDirectPermissions] = React.useState<string[]>([]);
  const [suspendOpen, setSuspendOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    if (data) {
      setRoles(data.roles);
      setDirectPermissions(data.permissions_direct);
    }
  }, [data]);

  const rolesDirty =
    data &&
    (JSON.stringify([...roles].sort()) !== JSON.stringify([...data.roles].sort()) ||
      JSON.stringify([...directPermissions].sort()) !== JSON.stringify([...data.permissions_direct].sort()));

  const saveRoles = () => {
    if (!userId) return;
    update.mutate({ userId, payload: { roles, permissions: directPermissions } });
  };

  const handleImpersonate = () => {
    if (!userId) return;
    impersonate.mutate(userId, {
      onSuccess: ({ token, user }) => {
        startImpersonation(user, token);
        onClose();
        navigate('/app');
      },
    });
  };

  const isTrashed = !!data?.deleted_at;
  const isAdmin = data?.roles.includes('admin') ?? false;

  return (
    <Sheet open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        {isLoading || !data ? (
          <div className="p-6 space-y-3">
            <div className="h-12 bg-s2 rounded-lg animate-pulse" />
            <div className="h-24 bg-s2 rounded-lg animate-pulse" />
            <div className="h-40 bg-s2 rounded-lg animate-pulse" />
          </div>
        ) : (
          <UserDetailBody
            data={data}
            roles={roles}
            setRoles={setRoles}
            directPermissions={directPermissions}
            setDirectPermissions={setDirectPermissions}
            rolesDirty={!!rolesDirty}
            saveRoles={saveRoles}
            saving={update.isPending}
            isTrashed={isTrashed}
            isAdmin={isAdmin}
            onSuspend={() => setSuspendOpen(true)}
            onReactivate={() => userId && update.mutate({ userId, payload: { status: 'active' } })}
            onResetPassword={() => userId && passwordReset.mutate(userId)}
            onRevokeTokens={() => userId && revokeTokens.mutate(userId)}
            onVerifyEmail={() => userId && verifyEmail.mutate(userId)}
            onDisableTwoFactor={() => userId && disableTwoFactor.mutate(userId)}
            onImpersonate={handleImpersonate}
            onDelete={() => setDeleteOpen(true)}
            onRestore={() => userId && restore.mutate(userId)}
            mutationError={(update.error || passwordReset.error || impersonate.error) as Error | null}
            passwordResetDone={passwordReset.isSuccess}
            impersonating={impersonate.isPending}
          />
        )}

        {data && (
          <>
            <SuspendDialog
              open={suspendOpen}
              onOpenChange={setSuspendOpen}
              userName={data.name}
              pending={update.isPending}
              error={update.error as Error | null}
              onConfirm={(reason) => {
                if (!userId) return;
                update.mutate(
                  { userId, payload: { status: 'suspended', suspension_reason: reason || null } },
                  { onSuccess: () => setSuspendOpen(false) },
                );
              }}
            />
            <ConfirmDeleteDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              title={`Supprimer ${data.name} ?`}
              description="Le compte sera désactivé (suppression réversible) et toutes ses sessions révoquées."
              pending={remove.isPending}
              error={remove.error as Error | null}
              onConfirm={() => {
                if (!userId) return;
                remove.mutate(userId, { onSuccess: () => { setDeleteOpen(false); onClose(); } });
              }}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function UserDetailBody(props: {
  data: AdminUserDetail;
  roles: string[];
  setRoles: (r: string[]) => void;
  directPermissions: string[];
  setDirectPermissions: (p: string[]) => void;
  rolesDirty: boolean;
  saveRoles: () => void;
  saving: boolean;
  isTrashed: boolean;
  isAdmin: boolean;
  onSuspend: () => void;
  onReactivate: () => void;
  onResetPassword: () => void;
  onRevokeTokens: () => void;
  onVerifyEmail: () => void;
  onDisableTwoFactor: () => void;
  onImpersonate: () => void;
  onDelete: () => void;
  onRestore: () => void;
  mutationError: Error | null;
  passwordResetDone: boolean;
  impersonating: boolean;
}) {
  const { data } = props;
  const inherited = data.permissions_effective.filter((p) => !data.permissions_direct.includes(p));

  return (
    <div className="flex flex-col">
      {/* En-tête */}
      <div className="p-6 border-b border-b1">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center text-gold font-display text-sm font-semibold shrink-0">
            {initials(data.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-t1 font-display text-lg font-semibold truncate">{data.name}</h2>
            <p className="text-t3 text-[12px] truncate">{data.email}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className={['rounded-md border px-2 py-0.5 text-[10px] font-mono', STATUS_BADGE[data.status]].join(' ')}>
                {STATUS_LABEL[data.status]}
              </span>
              {data.roles.map((r) => (
                <span key={r} className="rounded-md border border-b1 bg-s2 px-2 py-0.5 text-[10px] font-mono text-t2">
                  {ROLE_LABELS[r] ?? r}
                </span>
              ))}
              {props.isTrashed && (
                <span className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-mono text-red-400">
                  Supprimé
                </span>
              )}
            </div>
          </div>
        </div>
        {data.status === 'suspended' && data.suspension_reason && (
          <p className="mt-3 text-[11px] text-red-400/90 bg-red-500/5 border border-red-500/15 rounded-md px-2.5 py-1.5">
            Motif : {data.suspension_reason}
          </p>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Faits rapides */}
        <div className="grid grid-cols-2 gap-2">
          <Fact
            icon={data.is_online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            label="Présence"
            value={data.is_online ? 'En ligne' : fmtDate(data.last_seen_at)}
            tone={data.is_online ? 'ok' : undefined}
          />
          <Fact
            icon={data.email_verified ? <MailCheck className="w-3 h-3" /> : <MailX className="w-3 h-3" />}
            label="Email"
            value={data.email_verified ? 'Vérifié' : 'Non vérifié'}
            tone={data.email_verified ? 'ok' : 'warn'}
          />
          <Fact
            icon={data.two_factor_enabled ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            label="2FA"
            value={data.two_factor_enabled ? 'Activée' : 'Désactivée'}
            tone={data.two_factor_enabled ? 'ok' : undefined}
          />
          <Fact icon={<Clock className="w-3 h-3" />} label="Sessions" value={String(data.active_tokens_count)} />
          <Fact icon={<FolderOpen className="w-3 h-3" />} label="Dossiers" value={String(data.dossiers_count)} />
          <Fact icon={<MessagesSquare className="w-3 h-3" />} label="Conversations" value={String(data.conversations_count)} />
        </div>

        {/* Abonnement */}
        {data.subscription && (
          <section className="space-y-1.5">
            <h3 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Abonnement</h3>
            <div className="rounded-lg border border-b1 bg-s2 px-3 py-2 text-[12px] text-t2 flex items-center justify-between">
              <span>{data.subscription.name} · {data.subscription.stripe_status}</span>
              <span className={data.subscription.active ? 'text-emerald-400' : 'text-t4'}>
                {data.subscription.active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </section>
        )}

        {/* Rôles & permissions */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Rôles & permissions</h3>
            {props.rolesDirty && (
              <Button size="sm" variant="gold" onClick={props.saveRoles} disabled={props.saving} className="gap-1.5 h-7">
                <Save className="w-3.5 h-3.5" />
                {props.saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            )}
          </div>
          <RolesPermissionsEditor
            roles={props.roles}
            onRolesChange={props.setRoles}
            directPermissions={props.directPermissions}
            onDirectPermissionsChange={props.setDirectPermissions}
            inheritedPermissions={inherited}
          />
        </section>

        {/* Consentements */}
        {data.settings && (
          <section className="space-y-1.5">
            <h3 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Préférences & consentements</h3>
            <div className="rounded-lg border border-b1 bg-s2 px-3 py-2 text-[12px] text-t2 space-y-1">
              <div className="flex justify-between"><span className="text-t4">Langue / fuseau</span><span>{data.settings.locale} · {data.settings.timezone}</span></div>
              <div className="flex justify-between"><span className="text-t4">Marketing</span><span>{data.settings.marketing_consent ? 'Oui' : 'Non'}</span></div>
              <div className="flex justify-between"><span className="text-t4">Analytics</span><span>{data.settings.analytics_consent ? 'Oui' : 'Non'}</span></div>
            </div>
          </section>
        )}

        {/* Quota IA — mibeko-dashboard#95 */}
        <AiQuotaOverrideSection userId={data.id} aiQuota={data.ai_quota} />

        {/* Journal d'audit */}
        {data.recent_audits.length > 0 && (
          <section className="space-y-1.5">
            <h3 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Journal d'activité</h3>
            <ul className="space-y-1.5">
              {data.recent_audits.map((a) => (
                <li key={a.id} className="rounded-lg border border-b1 bg-s2 px-3 py-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-t1 font-mono">{a.event}{a.changed.length > 0 && <span className="text-t4"> · {a.changed.join(', ')}</span>}</span>
                    <span className="text-t4 shrink-0">{fmtDate(a.created_at)}</span>
                  </div>
                  {a.actor_name && <div className="text-t4 mt-0.5">par {a.actor_name}</div>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Actions */}
        <section className="space-y-2">
          <h3 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Actions</h3>

          {props.passwordResetDone && (
            <p className="text-emerald-400 text-[11px] font-mono">Code de réinitialisation envoyé.</p>
          )}
          {props.mutationError && <p className="text-red text-[11px] font-mono">{props.mutationError.message}</p>}

          {props.isTrashed ? (
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={props.onRestore}>
              <RotateCcw className="w-3.5 h-3.5" /> Restaurer le compte
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {data.status === 'suspended' ? (
                <Button variant="outline" size="sm" className="gap-2" onClick={props.onReactivate}>
                  <ShieldCheck className="w-3.5 h-3.5" /> Réactiver
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="gap-2" onClick={props.onSuspend}>
                  <Ban className="w-3.5 h-3.5" /> Suspendre
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-2" onClick={props.onResetPassword}>
                <KeyRound className="w-3.5 h-3.5" /> Reset MDP
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={props.onRevokeTokens}>
                <ShieldOff className="w-3.5 h-3.5" /> Déconnecter
              </Button>
              {!data.email_verified && (
                <Button variant="outline" size="sm" className="gap-2" onClick={props.onVerifyEmail}>
                  <MailCheck className="w-3.5 h-3.5" /> Vérifier email
                </Button>
              )}
              {data.two_factor_enabled && (
                <Button variant="outline" size="sm" className="gap-2" onClick={props.onDisableTwoFactor}>
                  <Unlock className="w-3.5 h-3.5" /> Désactiver 2FA
                </Button>
              )}
              {!props.isAdmin && data.status === 'active' && (
                <Button variant="outline" size="sm" className="gap-2" onClick={props.onImpersonate} disabled={props.impersonating}>
                  <LogIn className="w-3.5 h-3.5" /> {props.impersonating ? '…' : 'Incarner'}
                </Button>
              )}
              <Button variant="danger" size="sm" className="gap-2 col-span-2" onClick={props.onDelete}>
                <Trash2 className="w-3.5 h-3.5" /> Supprimer le compte
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Override de quota IA — mibeko-dashboard#95. Pensé pour une vente manuelle
 * (§11.3 du business model) : l'admin saisit le chiffre ici, jamais un
 * parcours self-service. Le quota effectif affiché tient déjà compte de
 * l'override (`AiUserQuotaTier::resolve()` côté serveur).
 */
function AiQuotaOverrideSection({
  userId,
  aiQuota,
}: {
  userId: string;
  aiQuota: AdminUserDetail['ai_quota'];
}) {
  const { set, remove } = useUserAiQuotaOverrideMutations(userId);
  const [editing, setEditing] = React.useState(false);
  const [limit, setLimit] = React.useState('');
  const [note, setNote] = React.useState('');

  const startEdit = () => {
    setLimit(String(aiQuota.override_limit ?? aiQuota.effective.limit));
    setNote(aiQuota.override_note ?? '');
    setEditing(true);
  };

  const save = () => {
    set.mutate(
      { limit: Number(limit), note: note.trim() || undefined },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h3 className="text-t4 text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Quota IA
        </h3>
        {!editing && (
          <button
            onClick={startEdit}
            className="p-1 rounded-md text-t3 hover:text-t1 hover:bg-s2 transition-colors"
            title="Poser un override"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="rounded-lg border border-b1 bg-s2 px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="h-8 text-[12px]"
              autoFocus
            />
            <span className="text-t4 text-[11px] font-mono shrink-0">
              {aiQuota.effective.scope === 'day' ? '/ jour' : '/ mois'}
            </span>
          </div>
          <Input
            placeholder="Note (ex : vente manuelle du 05/09/2026)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-8 text-[12px]"
          />
          {set.isError && <p className="text-red text-[11px] font-mono">{(set.error as Error).message}</p>}
          <div className="flex items-center gap-1.5 pt-0.5">
            <Button size="sm" variant="gold" onClick={save} disabled={set.isPending || !limit} className="h-7">
              {set.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-7 gap-1">
              <X className="w-3 h-3" /> Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-b1 bg-s2 px-3 py-2 text-[12px] text-t2 space-y-1">
          <div className="flex justify-between">
            <span className="text-t4">Limite effective</span>
            <span>
              {aiQuota.effective.limit} {aiQuota.effective.scope === 'day' ? '/ jour' : '/ mois'}
            </span>
          </div>
          {aiQuota.override_limit !== null ? (
            <>
              <div className="flex justify-between">
                <span className="text-t4">Override posé</span>
                <span className="text-gold">{aiQuota.override_limit}</span>
              </div>
              {aiQuota.override_note && (
                <div className="text-t4 text-[11px]">{aiQuota.override_note}</div>
              )}
              <button
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
                className="text-[11px] text-red hover:underline disabled:opacity-40 pt-0.5"
              >
                {remove.isPending ? 'Retrait…' : 'Retirer l\'override'}
              </button>
            </>
          ) : (
            <div className="text-t4 text-[11px]">Aucun override — palier normal du rôle.</div>
          )}
        </div>
      )}
    </section>
  );
}

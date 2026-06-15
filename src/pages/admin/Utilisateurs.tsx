import React from 'react';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import {
  useUsers, useUserStats, useInvitations, useInvitationMutations,
} from '@/features/admin/hooks/useUsers';
import {
  ROLE_OPTIONS, ROLE_LABELS, type UserFilters, type UserStatus, type AdminUserRow, type InvitationRef,
} from '@/features/admin/api/usersApi';
import UserDetailDrawer from '@/features/admin/components/UserDetailDrawer';
import UserFormModal from '@/features/admin/components/UserFormModal';
import {
  Users, UserPlus, Search, Wifi, Mail, RotateCcw, X, ChevronLeft, ChevronRight,
} from 'lucide-react';

type Tab = 'all' | 'team' | 'client' | 'invitations';

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active', label: 'Actifs' },
  { value: 'suspended', label: 'Suspendus' },
  { value: 'pending', label: 'En attente' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
  pending: 'bg-gold/10 text-gold border-gold/20',
};
const STATUS_LABEL: Record<string, string> = { active: 'Actif', suspended: 'Suspendu', pending: 'En attente' };
const INVITE_BADGE: Record<string, string> = {
  pending: 'bg-gold/10 text-gold border-gold/20',
  accepted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  expired: 'bg-s2 text-t4 border-b1',
};
const INVITE_LABEL: Record<string, string> = { pending: 'En attente', accepted: 'Acceptée', expired: 'Expirée' };

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function StatCard({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <div className="bg-s1 border border-b1 rounded-xl px-3.5 py-2.5">
      <div className="text-t3 text-[10px] font-mono uppercase tracking-wide">{label}</div>
      <div className="text-t1 font-display text-xl font-semibold mt-0.5">
        {loading ? <span className="text-t4">—</span> : (value ?? 0).toLocaleString('fr-FR')}
      </div>
    </div>
  );
}

export default function Utilisateurs() {
  const [tab, setTab] = React.useState<Tab>('all');
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [role, setRole] = React.useState<string | undefined>();
  const [status, setStatus] = React.useState<UserStatus | undefined>();
  const [online, setOnline] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters: UserFilters = {
    search: debounced || undefined,
    role,
    status,
    online: online || undefined,
    segment: tab === 'team' ? 'team' : tab === 'client' ? 'client' : undefined,
    page,
  };

  const { data: stats, isLoading: statsLoading } = useUserStats();
  const usersQuery = useUsers(filters);
  const invitationsQuery = useInvitations();

  const users = usersQuery.data?.data ?? [];
  const pagination = usersQuery.data?.pagination;

  const switchTab = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setRole(undefined);
    setStatus(undefined);
    setOnline(false);
    setPage(1);
  };

  const hasFilters = !!(debounced || role || status || online);

  return (
    <AppLayout space="admin">
      <div className="flex flex-col h-full">
        <header className="px-6 py-5 border-b border-b1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-t1 font-display text-xl font-semibold">Utilisateurs</h1>
                <p className="text-t3 text-xs font-mono mt-0.5">Annuaire, accès et cycle de vie des comptes</p>
              </div>
            </div>
            <Button variant="gold" size="sm" className="gap-2" onClick={() => setFormOpen(true)}>
              <UserPlus className="w-4 h-4" /> Ajouter
            </Button>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5 mt-4">
            <StatCard label="Total" value={stats?.total} loading={statsLoading} />
            <StatCard label="En ligne" value={stats?.online} loading={statsLoading} />
            <StatCard label="Actifs" value={stats?.active} loading={statsLoading} />
            <StatCard label="Suspendus" value={stats?.suspended} loading={statsLoading} />
            <StatCard label="En attente" value={stats?.pending} loading={statsLoading} />
            <StatCard label="Nouveaux 7j" value={stats?.new_last_7_days} loading={statsLoading} />
          </div>

          {/* Onglets */}
          <div className="flex gap-1 mt-4">
            {([
              { key: 'all', label: 'Tous' },
              { key: 'team', label: 'Équipe' },
              { key: 'client', label: 'Clients' },
              { key: 'invitations', label: 'Invitations' },
            ] as { key: Tab; label: string }[]).map((t) => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                className={[
                  'text-[12px] rounded-md px-3 py-1.5 transition-colors border',
                  tab === t.key ? 'bg-gold/10 text-gold border-gold/20' : 'text-t3 hover:text-t2 border-transparent hover:bg-s2',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {tab === 'invitations' ? (
            <InvitationsPanel query={invitationsQuery} />
          ) : (
            <>
              {/* Filtres */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-t4" />
                  <Input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Rechercher par nom ou email…"
                    className="pl-8 h-9"
                  />
                </div>
                <select
                  value={role ?? ''}
                  onChange={(e) => { setRole(e.target.value || undefined); setPage(1); }}
                  className="h-9 rounded-lg border border-b1 bg-s2 px-2.5 text-[12px] text-t2 focus:outline-none focus:ring-2 focus:ring-gold/40"
                >
                  <option value="">Tous les rôles</option>
                  {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => { setStatus(status === s.value ? undefined : s.value); setPage(1); }}
                    className={[
                      'text-[12px] rounded-md px-2.5 py-1.5 border transition-colors',
                      status === s.value ? 'bg-gold/10 text-gold border-gold/20' : 'text-t3 border-b1 hover:text-t2 hover:bg-s2',
                    ].join(' ')}
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  onClick={() => { setOnline((v) => !v); setPage(1); }}
                  className={[
                    'flex items-center gap-1.5 text-[12px] rounded-md px-2.5 py-1.5 border transition-colors',
                    online ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'text-t3 border-b1 hover:text-t2 hover:bg-s2',
                  ].join(' ')}
                >
                  <Wifi className="w-3.5 h-3.5" /> En ligne
                </button>
                {hasFilters && (
                  <button onClick={resetFilters} className="flex items-center gap-1 text-[12px] text-t4 hover:text-t2 px-1.5">
                    <X className="w-3.5 h-3.5" /> Réinitialiser
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="border border-b1 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-s2 text-t4 text-[10px] font-mono uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Utilisateur</th>
                      <th className="px-4 py-2.5 font-medium hidden md:table-cell">Rôles</th>
                      <th className="px-4 py-2.5 font-medium">Statut</th>
                      <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Présence</th>
                      <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Inscrit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-b1">
                    {usersQuery.isLoading ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-t4 text-[12px]">Chargement…</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-t4 text-[12px]">Aucun utilisateur</td></tr>
                    ) : (
                      users.map((u) => <UserRow key={u.id} user={u} onClick={() => setSelectedId(u.id)} />)
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.last_page > 1 && (
                <div className="flex items-center justify-between mt-3 text-[12px] text-t3">
                  <span>{pagination.total} utilisateur{pagination.total > 1 ? 's' : ''}</span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="p-1.5 rounded-md border border-b1 hover:bg-s2 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono">{pagination.current_page} / {pagination.last_page}</span>
                    <button
                      disabled={page >= pagination.last_page}
                      onClick={() => setPage((p) => p + 1)}
                      className="p-1.5 rounded-md border border-b1 hover:bg-s2 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <UserDetailDrawer userId={selectedId} onClose={() => setSelectedId(null)} />
      <UserFormModal open={formOpen} onOpenChange={setFormOpen} />
    </AppLayout>
  );
}

function UserRow({ user, onClick }: { user: AdminUserRow; onClick: () => void }) {
  return (
    <tr onClick={onClick} className="hover:bg-s2/60 cursor-pointer transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center text-gold text-[11px] font-semibold shrink-0">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <div className="text-t1 text-[13px] truncate flex items-center gap-1.5">
              {user.name}
              {user.deleted_at && <span className="text-red-400 text-[10px] font-mono">(supprimé)</span>}
            </div>
            <div className="text-t4 text-[11px] truncate">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="flex flex-wrap gap-1">
          {user.roles.map((r) => (
            <span key={r} className="rounded border border-b1 bg-s2 px-1.5 py-0.5 text-[10px] font-mono text-t3">
              {ROLE_LABELS[r] ?? r}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={['rounded-md border px-2 py-0.5 text-[10px] font-mono', STATUS_BADGE[user.status]].join(' ')}>
          {STATUS_LABEL[user.status]}
        </span>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="flex items-center gap-1.5 text-[11px] text-t3">
          <span className={['w-1.5 h-1.5 rounded-full', user.is_online ? 'bg-emerald-400' : 'bg-t4'].join(' ')} />
          {user.is_online ? 'En ligne' : fmtDate(user.last_seen_at)}
        </span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-[11px] text-t3">{fmtDate(user.created_at)}</td>
    </tr>
  );
}

function InvitationsPanel({ query }: { query: ReturnType<typeof useInvitations> }) {
  const { resend, remove } = useInvitationMutations();
  const invitations = query.data ?? [];

  if (query.isLoading) {
    return <p className="text-t4 text-[12px] py-10 text-center">Chargement…</p>;
  }
  if (invitations.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="w-8 h-8 text-t4 mx-auto mb-2" />
        <p className="text-t3 text-[13px]">Aucune invitation</p>
        <p className="text-t4 text-[11px] mt-1">Invitez un membre via le bouton « Ajouter ».</p>
      </div>
    );
  }

  return (
    <div className="border border-b1 rounded-xl overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-s2 text-t4 text-[10px] font-mono uppercase tracking-wide">
          <tr>
            <th className="px-4 py-2.5 font-medium">Email</th>
            <th className="px-4 py-2.5 font-medium hidden md:table-cell">Rôles</th>
            <th className="px-4 py-2.5 font-medium">Statut</th>
            <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Expire</th>
            <th className="px-4 py-2.5 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-b1">
          {invitations.map((inv: InvitationRef) => (
            <tr key={inv.id} className="hover:bg-s2/60 transition-colors">
              <td className="px-4 py-3 text-t1 text-[13px]">{inv.email}</td>
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="flex flex-wrap gap-1">
                  {inv.roles.map((r) => (
                    <span key={r} className="rounded border border-b1 bg-s2 px-1.5 py-0.5 text-[10px] font-mono text-t3">
                      {ROLE_LABELS[r] ?? r}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={['rounded-md border px-2 py-0.5 text-[10px] font-mono', INVITE_BADGE[inv.status]].join(' ')}>
                  {INVITE_LABEL[inv.status]}
                </span>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-[11px] text-t3">{fmtDate(inv.expires_at)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  {inv.status !== 'accepted' && (
                    <button
                      onClick={() => resend.mutate(inv.id)}
                      disabled={resend.isPending}
                      className="flex items-center gap-1 text-[11px] text-t3 hover:text-gold px-2 py-1 rounded-md hover:bg-s2"
                      title="Renvoyer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Renvoyer
                    </button>
                  )}
                  <button
                    onClick={() => remove.mutate(inv.id)}
                    disabled={remove.isPending}
                    className="flex items-center gap-1 text-[11px] text-t3 hover:text-red-400 px-2 py-1 rounded-md hover:bg-s2"
                    title="Annuler"
                  >
                    <X className="w-3.5 h-3.5" /> Annuler
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

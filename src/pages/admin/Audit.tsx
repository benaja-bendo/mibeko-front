import React from 'react';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/shared/components/ui/Dialog';
import { Label } from '@/shared/components/ui/Label';
import { useAudits, useAuditStats, useAuditFilters, useAuditMutations } from '@/features/admin/hooks/useAudit';
import { downloadAuditsCsv, type AuditFilters, type AuditPeriod, type AuditEntry } from '@/features/admin/api/auditApi';
import AuditDetailDrawer from '@/features/admin/components/AuditDetailDrawer';
import { EVENT_BADGE, EVENT_LABEL_FALLBACK, typeIcon } from '@/features/admin/components/auditMeta';
import { formatCompactNumber } from '@/shared/lib/formatNumber';
import {
  Activity, Search, Download, Trash2, ShieldAlert, UserCheck, ChevronLeft, ChevronRight,
  ChevronDown, ChevronRight as ChevronRightSmall, X,
} from 'lucide-react';

const PERIODS: { value: AuditPeriod; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: 'all', label: 'Tout' },
];

function relativeTime(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}

function initials(name?: string | null): string {
  if (!name) return 'SY';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function StatCard({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <div className="bg-s1 border border-b1 rounded-xl px-3.5 py-2.5">
      <div className="text-t3 text-[10px] font-mono uppercase tracking-wide">{label}</div>
      <div className="text-t1 font-display text-xl font-semibold mt-0.5">
        {loading ? <span className="text-t4">—</span> : formatCompactNumber(value ?? 0)}
      </div>
    </div>
  );
}

// Regroupe les entrées consécutives identiques (même acteur/événement/type/minute).
type FeedItem = { kind: 'single'; entry: AuditEntry } | { kind: 'group'; key: string; entries: AuditEntry[] };

function buildFeed(entries: AuditEntry[]): FeedItem[] {
  const raw: { key: string; entries: AuditEntry[] }[] = [];
  for (const e of entries) {
    const key = `${e.actor?.id ?? 'system'}|${e.event}|${e.object.type}|${(e.created_at ?? '').slice(0, 16)}`;
    const last = raw[raw.length - 1];
    if (last && last.key === key) last.entries.push(e);
    else raw.push({ key, entries: [e] });
  }
  return raw.flatMap((g) =>
    g.entries.length >= 3
      ? [{ kind: 'group', key: g.key, entries: g.entries } as FeedItem]
      : g.entries.map((entry) => ({ kind: 'single', entry } as FeedItem)),
  );
}

const GROUP_VERB: Record<string, string> = {
  created: 'créé', updated: 'modifié', deleted: 'supprimé', restored: 'restauré',
};

export default function Audit() {
  const [period, setPeriod] = React.useState<AuditPeriod>('7d');
  const [event, setEvent] = React.useState<string | undefined>();
  const [type, setType] = React.useState<string | undefined>();
  const [actor, setActor] = React.useState<string | undefined>();
  const [preset, setPreset] = React.useState<'sensitive' | 'mine' | undefined>();
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [purgeOpen, setPurgeOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters: AuditFilters = {
    period, event, auditable_type: type, user_id: actor, preset, q: debounced || undefined, page,
  };

  const { data: stats, isLoading: statsLoading } = useAuditStats();
  const { data: filterOptions } = useAuditFilters();
  const auditsQuery = useAudits(filters);
  const { purge } = useAuditMutations();

  const entries = auditsQuery.data?.data;
  const pagination = auditsQuery.data?.pagination;
  const feed = React.useMemo(() => buildFeed(entries ?? []), [entries]);

  const resetPage = () => setPage(1);
  const hasFilters = !!(event || type || actor || preset || debounced);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAuditsCsv(filters);
    } finally {
      setExporting(false);
    }
  };

  const toggleGroup = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <AppLayout space="admin">
      <div className="flex flex-col h-full">
        <header className="px-6 py-5 border-b border-b1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-t1 font-display text-xl font-semibold">Journal d'activité</h1>
                <p className="text-t3 text-xs font-mono mt-0.5">Qui a fait quoi, quand — traçabilité des actions</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={exporting}>
                <Download className="w-3.5 h-3.5" /> {exporting ? 'Export…' : 'Exporter'}
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-red-400 hover:text-red-400" onClick={() => setPurgeOpen(true)}>
                <Trash2 className="w-3.5 h-3.5" /> Purger
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2.5 mt-4 max-w-md">
            <StatCard label="Aujourd'hui" value={stats?.today} loading={statsLoading} />
            <StatCard label="7 jours" value={stats?.last_7_days} loading={statsLoading} />
            <StatCard label="30 jours" value={stats?.last_30_days} loading={statsLoading} />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {/* Filtres */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex gap-1 mr-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => { setPeriod(p.value); resetPage(); }}
                  className={[
                    'text-[12px] rounded-md px-2.5 py-1.5 border transition-colors',
                    period === p.value ? 'bg-gold/10 text-gold border-gold/20' : 'text-t3 border-b1 hover:text-t2 hover:bg-s2',
                  ].join(' ')}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-t4" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                placeholder="Rechercher dans les valeurs…"
                className="pl-8 h-9"
              />
            </div>

            <select
              value={event ?? ''}
              onChange={(e) => { setEvent(e.target.value || undefined); resetPage(); }}
              className="h-9 rounded-lg border border-b1 bg-s2 px-2.5 text-[12px] text-t2 focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="">Tous les événements</option>
              {filterOptions?.events.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
            </select>

            <select
              value={type ?? ''}
              onChange={(e) => { setType(e.target.value || undefined); resetPage(); }}
              className="h-9 rounded-lg border border-b1 bg-s2 px-2.5 text-[12px] text-t2 focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="">Tous les objets</option>
              {filterOptions?.types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            <select
              value={actor ?? ''}
              onChange={(e) => { setActor(e.target.value || undefined); resetPage(); }}
              className="h-9 rounded-lg border border-b1 bg-s2 px-2.5 text-[12px] text-t2 focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="">Tous les acteurs</option>
              {filterOptions?.actors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            {/* Presets */}
            <button
              onClick={() => { setPreset(preset === 'sensitive' ? undefined : 'sensitive'); resetPage(); }}
              className={[
                'flex items-center gap-1.5 text-[12px] rounded-md px-2.5 py-1.5 border transition-colors',
                preset === 'sensitive' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'text-t3 border-b1 hover:text-t2 hover:bg-s2',
              ].join(' ')}
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Actions sensibles
            </button>
            <button
              onClick={() => { setPreset(preset === 'mine' ? undefined : 'mine'); resetPage(); }}
              className={[
                'flex items-center gap-1.5 text-[12px] rounded-md px-2.5 py-1.5 border transition-colors',
                preset === 'mine' ? 'bg-gold/10 text-gold border-gold/20' : 'text-t3 border-b1 hover:text-t2 hover:bg-s2',
              ].join(' ')}
            >
              <UserCheck className="w-3.5 h-3.5" /> Mes actions
            </button>

            {hasFilters && (
              <button
                onClick={() => { setEvent(undefined); setType(undefined); setActor(undefined); setPreset(undefined); setSearch(''); resetPage(); }}
                className="flex items-center gap-1 text-[12px] text-t4 hover:text-t2 px-1.5"
              >
                <X className="w-3.5 h-3.5" /> Réinitialiser
              </button>
            )}
          </div>

          {/* Fil */}
          {auditsQuery.isLoading ? (
            <p className="text-t4 text-[12px] py-10 text-center">Chargement…</p>
          ) : feed.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-8 h-8 text-t4 mx-auto mb-2" />
              <p className="text-t3 text-[13px]">Aucune activité sur cette période</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {feed.map((item) =>
                item.kind === 'single' ? (
                  <FeedRow key={item.entry.id} entry={item.entry} onClick={() => setSelectedId(item.entry.id)} />
                ) : (
                  <GroupRow
                    key={item.key}
                    entries={item.entries}
                    open={expanded.has(item.key)}
                    onToggle={() => toggleGroup(item.key)}
                    onSelect={setSelectedId}
                  />
                ),
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.last_page > 1 && (
            <div className="flex items-center justify-between mt-4 text-[12px] text-t3">
              <span>{pagination.total} entrée{pagination.total > 1 ? 's' : ''}</span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-md border border-b1 hover:bg-s2 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono">{pagination.current_page} / {pagination.last_page}</span>
                <button disabled={page >= pagination.last_page} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-md border border-b1 hover:bg-s2 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AuditDetailDrawer auditId={selectedId} onClose={() => setSelectedId(null)} />
      <PurgeDialog
        open={purgeOpen}
        onOpenChange={setPurgeOpen}
        pending={purge.isPending}
        error={purge.error as Error | null}
        onConfirm={(days) => purge.mutate(days, { onSuccess: () => setPurgeOpen(false) })}
      />
    </AppLayout>
  );
}

function FeedRow({ entry, onClick }: { entry: AuditEntry; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 text-left rounded-lg border border-b1 bg-s1 hover:bg-s2 px-3 py-2.5 transition-colors"
    >
      <div className="w-8 h-8 rounded-full bg-s2 border border-b1 flex items-center justify-center text-t3 text-[10px] font-semibold shrink-0">
        {initials(entry.actor?.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-t1 text-[13px] truncate">
          <span className="font-medium">{entry.actor?.name ?? 'Système'}</span>{' '}
          <span className="text-t2">{entry.summary}</span>
        </p>
        <div className="flex items-center gap-1.5 text-t4 text-[11px] mt-0.5">
          {typeIcon(entry.object.type)}
          <span>{entry.object.type_label}</span>
          <span>·</span>
          <span>{relativeTime(entry.created_at)}</span>
        </div>
      </div>
      <span className={['rounded-md border px-2 py-0.5 text-[10px] font-mono shrink-0', EVENT_BADGE[entry.event] ?? EVENT_LABEL_FALLBACK].join(' ')}>
        {entry.event_label}
      </span>
    </button>
  );
}

function GroupRow({
  entries, open, onToggle, onSelect,
}: {
  entries: AuditEntry[];
  open: boolean;
  onToggle: () => void;
  onSelect: (id: number) => void;
}) {
  const first = entries[0];
  const verb = GROUP_VERB[first.event] ?? first.event_label.toLowerCase();
  return (
    <div className="rounded-lg border border-b1 bg-s1 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 text-left hover:bg-s2 px-3 py-2.5 transition-colors">
        <div className="w-8 h-8 rounded-full bg-s2 border border-b1 flex items-center justify-center text-t3 text-[10px] font-semibold shrink-0">
          {initials(first.actor?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-t1 text-[13px] truncate">
            <span className="font-medium">{first.actor?.name ?? 'Système'}</span>{' '}
            <span className="text-t2">a {verb} {entries.length} {first.object.type_label.toLowerCase()}s</span>
          </p>
          <div className="flex items-center gap-1.5 text-t4 text-[11px] mt-0.5">
            {typeIcon(first.object.type)}
            <span>{relativeTime(first.created_at)}</span>
          </div>
        </div>
        <span className={['rounded-md border px-2 py-0.5 text-[10px] font-mono shrink-0', EVENT_BADGE[first.event] ?? EVENT_LABEL_FALLBACK].join(' ')}>
          {first.event_label}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-t4 shrink-0" /> : <ChevronRightSmall className="w-4 h-4 text-t4 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-b1 divide-y divide-b1">
          {entries.map((e) => (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              className="w-full flex items-center gap-2 text-left px-3 py-2 pl-14 hover:bg-s2 transition-colors text-[12px] text-t2"
            >
              <span className="truncate">{e.object.label}</span>
              <span className="text-t4 ml-auto shrink-0">{relativeTime(e.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PurgeDialog({
  open, onOpenChange, onConfirm, pending, error,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (days: number) => void;
  pending?: boolean;
  error?: Error | null;
}) {
  const [days, setDays] = React.useState('365');

  React.useEffect(() => {
    if (open) setDays('365');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" /> Purger le journal
          </DialogTitle>
          <DialogDescription>
            Supprime définitivement les entrées plus anciennes que le nombre de jours indiqué. Action irréversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>Conserver les entrées des N derniers jours</Label>
          <Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className="h-9" />
        </div>

        {error && <p className="text-red text-[11px] font-mono">{error.message}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button variant="danger" size="sm" disabled={pending || !days} onClick={() => onConfirm(Math.max(1, parseInt(days, 10) || 365))}>
            {pending ? 'Purge…' : 'Purger'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

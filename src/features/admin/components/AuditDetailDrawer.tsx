import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent } from '@/shared/components/ui/Sheet';
import { useAudit } from '@/features/admin/hooks/useAudit';
import { EVENT_BADGE, EVENT_LABEL_FALLBACK } from '@/features/admin/components/auditMeta';
import type { AuditChange } from '@/features/admin/api/auditApi';
import { ArrowRight, ExternalLink, Globe, MapPin, Monitor, User2 } from 'lucide-react';

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '∅';
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '∅';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function MetaRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="text-t4 flex items-center gap-1.5 w-24 shrink-0">{icon}{label}</span>
      <span className="text-t2 truncate font-mono">{value}</span>
    </div>
  );
}

function DiffRow({ change }: { change: AuditChange }) {
  const hasOld = change.old !== null && change.old !== undefined && change.old !== '';
  return (
    <div className="rounded-lg border border-b1 bg-s2 px-3 py-2">
      <div className="text-t3 text-[11px] font-mono mb-1">{change.field_label}</div>
      <div className="flex items-center gap-2 flex-wrap text-[12px]">
        {hasOld && (
          <span className="text-red-400/80 line-through font-mono break-all">{fmtValue(change.old)}</span>
        )}
        {hasOld && <ArrowRight className="w-3.5 h-3.5 text-t4 shrink-0" />}
        <span className="text-emerald-400 font-mono break-all">{fmtValue(change.new)}</span>
      </div>
    </div>
  );
}

export default function AuditDetailDrawer({ auditId, onClose }: { auditId: number | null; onClose: () => void }) {
  const { data, isLoading } = useAudit(auditId);

  return (
    <Sheet open={auditId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        {isLoading || !data ? (
          <div className="p-6 space-y-3">
            <div className="h-10 bg-s2 rounded-lg animate-pulse" />
            <div className="h-24 bg-s2 rounded-lg animate-pulse" />
            <div className="h-32 bg-s2 rounded-lg animate-pulse" />
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="p-6 border-b border-b1">
              <div className="flex items-center gap-2 mb-2">
                <span className={['rounded-md border px-2 py-0.5 text-[10px] font-mono', EVENT_BADGE[data.event] ?? EVENT_LABEL_FALLBACK].join(' ')}>
                  {data.event_label}
                </span>
                <span className="text-t4 text-[11px] font-mono">{data.object.type_label}</span>
              </div>
              <p className="text-t1 text-[14px]">
                <span className="font-semibold">{data.actor?.name ?? 'Système'}</span>{' '}
                {data.summary}
              </p>
              {data.object.link && (
                <Link
                  to={data.object.link}
                  className="inline-flex items-center gap-1.5 mt-2 text-[12px] text-gold hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ouvrir l'objet concerné
                </Link>
              )}
            </div>

            <div className="p-6 space-y-6">
              <section className="space-y-1.5">
                <h3 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Contexte</h3>
                <div className="space-y-1.5">
                  <MetaRow icon={<User2 className="w-3.5 h-3.5" />} label="Acteur" value={data.actor?.name ?? 'Système'} />
                  <MetaRow icon={<Globe className="w-3.5 h-3.5" />} label="Quand" value={fmtDate(data.created_at)} />
                  {data.ip_address && <MetaRow icon={<MapPin className="w-3.5 h-3.5" />} label="IP" value={data.ip_address} />}
                  {data.user_agent && <MetaRow icon={<Monitor className="w-3.5 h-3.5" />} label="Appareil" value={data.user_agent} />}
                </div>
                {data.url && <p className="text-t4 text-[11px] font-mono break-all mt-1">{data.url}</p>}
              </section>

              {data.changes.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Modifications</h3>
                  <div className="space-y-1.5">
                    {data.changes.map((c) => <DiffRow key={c.field} change={c} />)}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

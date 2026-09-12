import { Link } from 'react-router-dom';
import AppLayout from '@/widgets/layout/AppLayout';
import { useAdminSante } from '@/features/admin/hooks/useSante';
import type { SanteExtractionEchec, SanteMailIncident } from '@/features/admin/api/santeApi';
import { Activity, AlertTriangle, Check, FileWarning, Mail, Radio, Smartphone } from 'lucide-react';
import { formatCompactNumber } from '@/shared/lib/formatNumber';
import { formatDate } from '@/shared/lib/date';

function Metric({ label, value, loading, hint }: { label: string; value?: number; loading: boolean; hint?: string }) {
  return (
    <div className="bg-s1 border border-b1 rounded-xl px-4 py-3.5">
      <div className="text-t3 text-[11px] font-mono uppercase tracking-wide">{label}</div>
      <div className="text-t1 font-display text-2xl font-semibold mt-1">
        {loading ? <span className="text-t4">—</span> : formatCompactNumber(value ?? 0)}
      </div>
      {hint && !loading && <div className="text-t4 text-[11px] mt-1">{hint}</div>}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-s1 border border-b1 rounded-xl px-4 py-3.5">
      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
      <span className="text-t2 text-sm">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extractions en échec — motif + document, pas seulement un total
// ---------------------------------------------------------------------------

function ExtractionsList({ echecs }: { echecs: SanteExtractionEchec[] }) {
  if (echecs.length === 0) {
    return <EmptyState label="Aucune extraction en échec." />;
  }

  return (
    <div className="bg-s1 border border-b1 rounded-xl divide-y divide-b1">
      {echecs.map((echec) => (
        <Link
          key={echec.id}
          to={`/editor/viewer/${echec.document_id}`}
          className="flex items-start gap-2.5 px-4 py-3 hover:bg-s2 transition-colors"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-t1 text-sm truncate">{echec.document_titre ?? echec.document_id}</div>
            <div className="text-t3 text-xs mt-0.5">{echec.motif ?? 'Motif non renseigné'}</div>
          </div>
          <div className="text-t4 text-[11px] font-mono shrink-0">{formatDate(echec.finished_at)}</div>
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// File de mail — mêmes lignes que `mibeko:surveiller-file-mail`
// ---------------------------------------------------------------------------

function MailIncidentList({
  incidents,
  emptyLabel,
  renderDetail,
}: {
  incidents: SanteMailIncident[];
  emptyLabel: string;
  renderDetail: (incident: SanteMailIncident) => string;
}) {
  if (incidents.length === 0) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <div className="bg-s1 border border-b1 rounded-xl divide-y divide-b1">
      {incidents.map((incident, index) => (
        <div key={`${incident.classe}-${index}`} className="flex items-center gap-2.5 px-4 py-3">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-t1 text-sm flex-1">{incident.classe}</span>
          <span className="text-t4 text-[11px] font-mono shrink-0">{renderDetail(incident)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function Sante() {
  const { data, isLoading } = useAdminSante();

  return (
    <AppLayout space="admin">
      <div className="flex flex-col h-full">
        <header className="px-6 py-5 border-b border-b1">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div>
              <h1 className="text-t1 font-display text-xl font-semibold">Santé du système</h1>
              <p className="text-t3 text-xs font-mono mt-0.5">
                Pipeline d&apos;ingestion, veille, file de mail et parc mobile — sur un seul écran
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Extractions en échec */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5">
              <FileWarning className="w-3 h-3" /> Extractions en échec
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Metric label="Total en échec" value={data?.extractions.total_echecs} loading={isLoading} />
            </div>
            {!isLoading && data && <ExtractionsList echecs={data.extractions.echecs} />}
          </section>

          {/* Veille et push */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5">
              <Radio className="w-3 h-3" /> Veille et push
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Metric label="Dispatches délivrés" value={data?.veille.dispatches_delivres} loading={isLoading} />
              <Metric label="Dispatches en échec" value={data?.veille.dispatches_en_echec} loading={isLoading} />
              <Metric
                label="Appareils joignables"
                value={data?.veille.appareils_joignables}
                loading={isLoading}
                hint="Actifs, avec jeton, hors simulateur"
              />
            </div>
          </section>

          {/* File de mail */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> File de mail — accès au compte
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Metric label="Échecs" value={data?.mail.total_echecs} loading={isLoading} />
              <Metric label="Bloqués" value={data?.mail.total_bloques} loading={isLoading} hint="Plus de 10 min en file" />
            </div>
            {!isLoading && data && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MailIncidentList
                  incidents={data.mail.echecs}
                  emptyLabel="Aucun échec."
                  renderDetail={(i) => formatDate(i.quand)}
                />
                <MailIncidentList
                  incidents={data.mail.bloques}
                  emptyLabel="Aucun blocage."
                  renderDetail={(i) => `${i.minutes ?? 0} min`}
                />
              </div>
            )}
          </section>

          {/* Parc mobile */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5">
              <Smartphone className="w-3 h-3" /> Parc mobile
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Metric label="Appareils actifs" value={data?.parc_mobile.total_actifs} loading={isLoading} />
              <Metric
                label="Version inconnue"
                value={data?.parc_mobile.version_inconnue}
                loading={isLoading}
                hint="Format hérité, antérieur à la v1.2"
              />
            </div>
            {!isLoading && data && data.parc_mobile.versions.length > 0 && (
              <div className="bg-s1 border border-b1 rounded-xl divide-y divide-b1">
                {data.parc_mobile.versions.map((v) => (
                  <div key={v.version} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-t1 text-sm font-mono">{v.version}</span>
                    <span className="text-t3 text-sm">{formatCompactNumber(v.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Corpus */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Santé du corpus</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Metric label="Publiés" value={data?.corpus.published} loading={isLoading} />
              <Metric label="En attente" value={data?.corpus.pending} loading={isLoading} />
              <Metric label="Signalés" value={data?.corpus.signales} loading={isLoading} />
              <Metric label="Versions sans embedding" value={data?.corpus.versions_without_embedding} loading={isLoading} />
              <Metric
                label="Retard de publication"
                value={data?.corpus.retard_publication.documents}
                loading={isLoading}
                hint={data ? `Non publiés depuis plus de ${data.corpus.retard_publication.seuil_jours} jours` : undefined}
              />
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

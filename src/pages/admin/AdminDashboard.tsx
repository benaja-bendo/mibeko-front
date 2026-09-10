import { Link } from 'react-router-dom';
import AppLayout from '@/widgets/layout/AppLayout';
import { useAdminOverview } from '@/features/admin/hooks/useAdmin';
import type { AdminOverview, AdminOverviewTrend } from '@/features/admin/api/adminApi';
import { BookText, ChevronRight, AlertTriangle, Check, Smartphone, Monitor } from 'lucide-react';
import { formatCompactNumber } from '@/shared/lib/formatNumber';

function Metric({
  label,
  value,
  loading,
  hint,
}: {
  label: string;
  value?: number;
  loading: boolean;
  hint?: string;
}) {
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

// ---------------------------------------------------------------------------
// Tendances — mibeko-dashboard#106
// ---------------------------------------------------------------------------

/**
 * Variation d'une mesure par rapport à la fenêtre précédente.
 *
 * `polarity` est indispensable : une hausse du nombre de questions est une
 * bonne nouvelle, une hausse du coût n'en est pas une. Colorier les deux en
 * vert parce qu'elles montent tromperait la lecture.
 */
function Delta({ value, previous, polarity }: { value: number; previous: number; polarity: 'up-good' | 'up-bad' }) {
  const diff = value - previous;

  if (diff === 0) {
    return <span className="text-t4 text-[11px] font-mono">stable</span>;
  }

  const rising = diff > 0;
  const favourable = polarity === 'up-good' ? rising : !rising;
  const percent = previous > 0 ? Math.round((diff / previous) * 100) : null;

  return (
    <span className={`text-[11px] font-mono ${favourable ? 'text-emerald-400' : 'text-amber-400'}`}>
      {rising ? '+' : '−'}
      {formatCompactNumber(Math.abs(diff))}
      {percent !== null && ` · ${rising ? '+' : '−'}${Math.abs(percent)} %`}
    </span>
  );
}

function TrendMetric({
  label,
  trend,
  loading,
  polarity,
  format = formatCompactNumber,
}: {
  label: string;
  trend?: AdminOverviewTrend;
  loading: boolean;
  polarity: 'up-good' | 'up-bad';
  format?: (value: number) => string;
}) {
  return (
    <div className="bg-s1 border border-b1 rounded-xl px-4 py-3.5">
      <div className="text-t3 text-[11px] font-mono uppercase tracking-wide">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-t1 font-display text-2xl font-semibold">
          {loading || !trend ? <span className="text-t4">—</span> : format(trend.value)}
        </span>
        {!loading && trend && <Delta value={trend.value} previous={trend.previous} polarity={polarity} />}
      </div>
    </div>
  );
}

const formatFcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`;

// ---------------------------------------------------------------------------
// Bandeau « demande une action » — mibeko-dashboard#106
// ---------------------------------------------------------------------------

interface ActionItem {
  key: string;
  count: number;
  label: string;
  to?: string;
}

/**
 * Construit la liste de ce qui demande une action. N'y figure que ce qui est
 * strictement positif : le bandeau est vide la plupart du temps, et c'est le
 * comportement voulu.
 *
 * La console IA (#108) reste signalée sans lien tant qu'elle n'a pas d'écran.
 */
function buildActions(attention: AdminOverview['attention']): ActionItem[] {
  const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

  return [
    {
      key: 'ai_errors',
      count: attention.ai_errors_24h,
      label: `${attention.ai_errors_24h} ${plural(attention.ai_errors_24h, 'erreur', 'erreurs')} de l'assistant IA sur 24 h`,
    },
    {
      key: 'contacts',
      to: '/admin/messages',
      count: attention.unhandled_contacts,
      label: `${attention.unhandled_contacts} ${plural(attention.unhandled_contacts, 'message de contact non traité', 'messages de contact non traités')}`,
    },
    {
      key: 'expiring',
      to: '/admin/abonnements',
      count: attention.plan_grants_expiring_soon,
      label: `${attention.plan_grants_expiring_soon} ${plural(attention.plan_grants_expiring_soon, 'abonnement Pro expire', 'abonnements Pro expirent')} sous 7 jours`,
    },
    {
      key: 'blocking',
      count: attention.open_flags_blocking,
      label: `${attention.open_flags_blocking} ${plural(attention.open_flags_blocking, 'signalement bloquant', 'signalements bloquants')}`,
      to: '/admin/signalements',
    },
    {
      key: 'extractions',
      count: attention.failed_extractions,
      label: `${attention.failed_extractions} ${plural(attention.failed_extractions, 'extraction en échec', 'extractions en échec')}`,
      to: '/editor/ingestion',
    },
  ].filter((item) => item.count > 0);
}

function ActionsRequises({ data, loading }: { data?: AdminOverview; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="bg-s1 border border-b1 rounded-xl px-4 py-3.5">
        <div className="text-t4 text-xs font-mono">Relevé en cours…</div>
      </div>
    );
  }

  const actions = buildActions(data.attention);

  if (actions.length === 0) {
    return (
      <div className="flex items-center gap-2.5 bg-s1 border border-b1 rounded-xl px-4 py-3.5">
        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-t2 text-sm">Rien ne demande d&apos;action.</span>
      </div>
    );
  }

  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-xl divide-y divide-red-500/10">
      {actions.map((action) => {
        const content = (
          <div className="flex items-center gap-2.5 px-4 py-3">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-t1 text-sm flex-1">{action.label}</span>
            {action.to && <ChevronRight className="w-4 h-4 text-t3 shrink-0" />}
          </div>
        );

        return action.to ? (
          <Link key={action.key} to={action.to} className="block hover:bg-red-500/5 transition-colors">
            {content}
          </Link>
        ) : (
          <div key={action.key}>{content}</div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const { data, isLoading } = useAdminOverview();

  const windowDays = data?.trend_window_days ?? 7;
  const adoptionDays = data?.adoption.window_days ?? 30;

  return (
    <AppLayout space="admin">
      <div className="flex flex-col h-full">
        <header className="px-6 py-5 border-b border-b1">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-red-400 fill-none stroke-[1.5]">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h1 className="text-t1 font-display text-xl font-semibold">Administration</h1>
              <p className="text-t3 text-xs font-mono mt-0.5">Accès restreint — Administrateurs uniquement</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Demande une action */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Demande une action</h2>
            <ActionsRequises data={data} loading={isLoading} />
          </section>

          {/* Activité */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest">
              Activité — {windowDays} derniers jours
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <TrendMetric
                label="Nouveaux comptes"
                trend={data?.trends.new_users}
                loading={isLoading}
                polarity="up-good"
              />
              <TrendMetric
                label="Questions à l'IA"
                trend={data?.trends.ai_questions}
                loading={isLoading}
                polarity="up-good"
              />
              <TrendMetric
                label="Coût IA mesuré"
                trend={data?.trends.ai_cost_fcfa}
                loading={isLoading}
                polarity="up-bad"
                format={formatFcfa}
              />
            </div>
          </section>

          {/* Adoption par surface */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest">
              Comptes actifs — {adoptionDays} derniers jours
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-s1 border border-b1 rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-t3 text-[11px] font-mono uppercase tracking-wide">
                  <Smartphone className="w-3 h-3" /> Mobile
                </div>
                <div className="text-t1 font-display text-2xl font-semibold mt-1">
                  {isLoading ? <span className="text-t4">—</span> : formatCompactNumber(data?.adoption.mobile_active ?? 0)}
                </div>
              </div>
              <div className="bg-s1 border border-b1 rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-t3 text-[11px] font-mono uppercase tracking-wide">
                  <Monitor className="w-3 h-3" /> Web
                </div>
                <div className="text-t1 font-display text-2xl font-semibold mt-1">
                  {isLoading ? <span className="text-t4">—</span> : formatCompactNumber(data?.adoption.web_active ?? 0)}
                </div>
              </div>
              {/* Compté à part : un même compte peut porter un jeton sur les deux surfaces. */}
              <Metric
                label="Comptes distincts"
                value={data?.adoption.total_active}
                loading={isLoading}
                hint="Sans double compte"
              />
            </div>
          </section>

          {/* Fonds juridique */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Fonds juridique</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Metric
                label="Documents"
                value={data?.content.documents}
                loading={isLoading}
                hint={
                  data ? `${formatCompactNumber(data.corpus.published)} publiés · ${formatCompactNumber(data.corpus.pending)} en attente` : undefined
                }
              />
              <Metric
                label="Articles"
                value={data?.content.articles}
                loading={isLoading}
                hint={
                  data && data.corpus.versions_without_embedding > 0
                    ? `${formatCompactNumber(data.corpus.versions_without_embedding)} versions sans embedding`
                    : undefined
                }
              />
              <Metric label="Journaux officiels" value={data?.content.official_journals} loading={isLoading} />
            </div>
          </section>

          {/* Référentiels */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Référentiels</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Metric label="Types de loi" value={data?.referentiels.document_types} loading={isLoading} />
              <Metric label="Institutions" value={data?.referentiels.institutions} loading={isLoading} />
              <Metric label="Tags" value={data?.referentiels.tags} loading={isLoading} />
            </div>
            <Link
              to="/admin/referentiels"
              className="flex items-center justify-between bg-s1 border border-b1 rounded-xl px-4 py-3 hover:bg-s2 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                  <BookText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-t1 text-sm font-medium">Gérer les référentiels</div>
                  <div className="text-t3 text-xs">Types de loi, institutions, tags</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-t3 group-hover:text-t1 transition-colors" />
            </Link>
          </section>

          {/* Pilotage */}
          <section className="space-y-2">
            <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest">Pilotage</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Link to="/admin/utilisateurs" className="block hover:bg-s2 rounded-xl transition-colors">
                <Metric label="Utilisateurs" value={data?.people.users} loading={isLoading} />
              </Link>
              <Link to="/admin/signalements" className="block hover:bg-s2 rounded-xl transition-colors">
                <Metric
                  label="Signalements ouverts"
                  value={data?.attention.open_flags}
                  loading={isLoading}
                  hint={
                    data
                      ? `${formatCompactNumber(data.attention.open_flags_blocking)} bloquants · ${formatCompactNumber(data.attention.open_flags_warning)} avertissements`
                      : undefined
                  }
                />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

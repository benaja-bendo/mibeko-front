/**
 * Dashboard.tsx — Page d'accueil de l'espace Pro (tableau de bord + veille).
 *
 * Agrège :
 *  - des raccourcis vers les outils (Assistant, Bibliothèque, Dossiers) ;
 *  - une veille juridique (derniers textes intégrés à la base — via Laravel) ;
 *  - les dossiers récents (local) et les dernières conversations IA (Laravel).
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  Library,
  FolderKanban,
  ArrowRight,
  FileText,
  MessageSquare,
  Newspaper,
  Clock,
} from 'lucide-react';
import AppLayout from '@/shared/components/layout/AppLayout';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getCatalog } from '@/features/documents/api/laravelApi';
import { useJournalsList } from '@/features/journals/hooks/useJournals';
import { useConversations } from '@/features/assistant/hooks/useConversations';
import { useDossiers } from '@/features/dossiers/hooks/useDossiers';
import StatusBadge from '@/features/dossiers/components/StatusBadge';

/** Formate une date ISO en jj/mm/aaaa (ou tiret si absente). */
function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

const QUICK_ACTIONS = [
  {
    to: '/app/assistant',
    icon: Sparkles,
    title: 'Assistant IA',
    desc: 'Posez une question juridique avec citations',
  },
  {
    to: '/app/library',
    icon: Library,
    title: 'Bibliothèque',
    desc: 'Recherchez dans les textes congolais & OHADA',
  },
  {
    to: '/app/dossiers',
    icon: FolderKanban,
    title: 'Dossiers',
    desc: 'Pilotez vos affaires en cours',
  },
];

/** Carte de section avec en-tête. */
function PanelCard({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-b1 bg-s1">
      <header className="flex items-center justify-between border-b border-b1 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-t1">
          <span className="text-gold">{icon}</span>
          {title}
        </h2>
        {action}
      </header>
      <div className="flex-1 p-2">{children}</div>
    </section>
  );
}

export default function AppDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: dossiers = [] } = useDossiers();

  // Veille juridique : derniers textes intégrés à la base.
  const { data: catalog, isLoading: loadingCatalog } = useQuery({
    queryKey: ['veille', 'recent-docs'],
    queryFn: () => getCatalog({ per_page: 12 }),
    staleTime: 5 * 60_000,
  });

  const { data: conversations } = useConversations({});

  // Derniers numéros du Journal Officiel publiés (kiosque).
  const { data: journalsData } = useJournalsList({ per_page: 3 });
  const recentJournals = journalsData?.data ?? [];

  // Tri des textes par date de publication décroissante.
  const recentDocs = useMemo(() => {
    const list = catalog?.data ?? [];
    return [...list]
      .sort(
        (a, b) =>
          new Date(b.date_publication ?? 0).getTime() -
          new Date(a.date_publication ?? 0).getTime(),
      )
      .slice(0, 6);
  }, [catalog?.data]);

  const recentDossiers = useMemo(
    () =>
      [...dossiers]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 4),
    [dossiers],
  );

  const recentConversations = (conversations?.data ?? []).slice(0, 4);

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <AppLayout space="app">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
          {/* En-tête */}
          <header className="mb-6">
            <h1 className="font-display text-2xl font-semibold text-t1">
              Bonjour{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-1 text-sm text-t3">
              Votre espace de travail juridique — droit congolais & OHADA.
            </p>
          </header>

          {/* Raccourcis */}
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-start gap-3 rounded-xl border border-b1 bg-s1 p-4 transition-colors hover:border-gold/30 hover:bg-s2"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
                  <action.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-medium text-t1">
                    {action.title}
                    <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-t3">
                    {action.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Grille de panneaux */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Veille juridique */}
            <div className="lg:col-span-2">
              <PanelCard
                icon={<Newspaper className="h-4 w-4" />}
                title="Veille juridique"
                action={
                  <Link
                    to="/app/library"
                    className="text-[11px] font-medium text-gold hover:underline"
                  >
                    Tout voir
                  </Link>
                }
              >
                {loadingCatalog ? (
                  <div className="space-y-1 p-1">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded-lg bg-s2" />
                    ))}
                  </div>
                ) : recentDocs.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-t3">
                    Aucun texte récent.
                  </p>
                ) : (
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {recentDocs.map((doc) => (
                      <li key={doc.id}>
                        <Link
                          to={`/app/library?doc=${doc.id}`}
                          className="flex items-start gap-2.5 rounded-lg p-2.5 transition-colors hover:bg-s2"
                        >
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-t1">
                              {doc.titre_officiel || doc.title || 'Document'}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-t3">
                              <span className="uppercase">
                                {doc.type?.code || doc.type_code || 'Texte'}
                              </span>
                              <span>·</span>
                              <Clock className="h-2.5 w-2.5" />
                              {fmtDate(doc.date_publication)}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </PanelCard>
            </div>

            {/* Derniers numéros du Journal Officiel */}
            <PanelCard
              icon={<Newspaper className="h-4 w-4" />}
              title="Derniers JO parus"
              action={
                <Link
                  to="/app/journals"
                  className="text-[11px] font-medium text-gold hover:underline"
                >
                  Ouvrir le kiosque
                </Link>
              }
            >
              {recentJournals.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-t3">
                  Aucun journal publié pour le moment.
                </p>
              ) : (
                <ul className="space-y-1">
                  {recentJournals.map((journal) => (
                    <li key={journal.id}>
                      <Link
                        to={`/app/journals/${journal.id}`}
                        className="flex items-start gap-2.5 rounded-lg p-2.5 transition-colors hover:bg-s2"
                      >
                        <Newspaper className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-t1">
                            {journal.title}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-t3">
                            <Clock className="h-2.5 w-2.5" />
                            {fmtDate(journal.publication_date)}
                            <span>·</span>
                            {journal.legal_documents_count ?? 0} texte{(journal.legal_documents_count ?? 0) > 1 ? 's' : ''}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </PanelCard>

            {/* Dossiers récents */}
            <PanelCard
              icon={<FolderKanban className="h-4 w-4" />}
              title="Dossiers récents"
              action={
                <Link
                  to="/app/dossiers"
                  className="text-[11px] font-medium text-gold hover:underline"
                >
                  Tout voir
                </Link>
              }
            >
              {recentDossiers.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-t3">
                  Aucun dossier.{' '}
                  <Link to="/app/dossiers" className="text-gold hover:underline">
                    En créer un
                  </Link>
                </p>
              ) : (
                <ul className="space-y-1">
                  {recentDossiers.map((d) => (
                    <li key={d.id}>
                      <Link
                        to={`/app/dossiers?open=${d.id}`}
                        className="flex items-center gap-2 rounded-lg p-2.5 transition-colors hover:bg-s2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-t1">
                            {d.title}
                          </p>
                          {d.client && (
                            <p className="truncate text-[10px] text-t3">
                              {d.client}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={d.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </PanelCard>

            {/* Conversations récentes */}
            <PanelCard
              icon={<MessageSquare className="h-4 w-4" />}
              title="Conversations récentes"
              action={
                <Link
                  to="/app/assistant"
                  className="text-[11px] font-medium text-gold hover:underline"
                >
                  Ouvrir
                </Link>
              }
            >
              {recentConversations.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-t3">
                  Aucune conversation.{' '}
                  <Link to="/app/assistant" className="text-gold hover:underline">
                    Démarrer
                  </Link>
                </p>
              ) : (
                <ul className="space-y-1">
                  {recentConversations.map((conv) => (
                    <li key={conv.id}>
                      <Link
                        to="/app/assistant"
                        className="flex items-center gap-2.5 rounded-lg p-2.5 transition-colors hover:bg-s2"
                      >
                        <MessageSquare className="h-4 w-4 shrink-0 text-t3" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-t1">
                            {conv.title || 'Sans titre'}
                          </p>
                          <p className="text-[10px] text-t3">
                            {fmtDate(conv.updated_at)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </PanelCard>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

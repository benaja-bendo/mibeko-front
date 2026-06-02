import AppLayout from '@/shared/components/layout/AppLayout';

export default function AdminDashboard() {
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

        <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.5]">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              ),
              label: 'Gestion des utilisateurs',
              desc: 'Comptes, rôles, accès',
              comingSoon: true,
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.5]">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              ),
              label: 'Monitoring pipeline',
              desc: 'Jobs, erreurs, throughput',
              comingSoon: true,
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.5]">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              ),
              label: 'Configuration globale',
              desc: 'Prompts IA, paramètres RAG',
              comingSoon: true,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-s1 border border-b1 rounded-xl p-5 space-y-3 opacity-60"
            >
              <div className="w-9 h-9 rounded-lg bg-s2 border border-b1 flex items-center justify-center text-t2">
                {card.icon}
              </div>
              <div>
                <div className="text-t1 text-sm font-medium">{card.label}</div>
                <div className="text-t3 text-xs mt-0.5">{card.desc}</div>
              </div>
              {card.comingSoon && (
                <span className="inline-block text-[10px] font-mono uppercase tracking-widest text-t4 bg-s2 border border-b1 rounded px-2 py-0.5">
                  Bientôt
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

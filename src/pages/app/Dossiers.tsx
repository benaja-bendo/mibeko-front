import AppLayout from '@/shared/components/layout/AppLayout';

export default function Dossiers() {
  return (
    <AppLayout space="app">
      <div className="flex flex-col h-full">
        <header className="px-6 py-5 border-b border-b1">
          <h1 className="text-t1 font-display text-xl font-semibold">Mes dossiers</h1>
          <p className="text-t3 text-sm mt-1">
            Organisez vos documents et recherches juridiques
          </p>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto">
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-gold fill-none stroke-[1.5]">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-t2 text-sm font-medium">Gestion des dossiers</p>
            <p className="text-t3 text-xs max-w-xs">
              Créez et organisez vos dossiers juridiques. Fonctionnalité à venir.
            </p>
            <button
              disabled
              className="mt-2 inline-flex items-center gap-2 bg-s1 border border-b1 text-t3 text-xs font-medium rounded-lg px-4 py-2 cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.5]">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nouveau dossier (bientôt)
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

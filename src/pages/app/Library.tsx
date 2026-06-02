import AppLayout from '@/shared/components/layout/AppLayout';

export default function Library() {
  return (
    <AppLayout space="app">
      <div className="flex flex-col h-full">
        <header className="px-6 py-5 border-b border-b1">
          <h1 className="text-t1 font-display text-xl font-semibold">Bibliothèque juridique</h1>
          <p className="text-t3 text-sm mt-1">
            Explorez les textes législatifs et réglementaires congolais
          </p>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto">
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-gold fill-none stroke-[1.5]">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <p className="text-t2 text-sm font-medium">Bibliothèque en construction</p>
            <p className="text-t3 text-xs max-w-xs">
              La navigation dans les textes juridiques sera disponible ici.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

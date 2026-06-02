import AppLayout from '@/shared/components/layout/AppLayout';

export default function AssistantPage() {
  return (
    <AppLayout space="app">
      <div className="flex flex-col h-full">
        <header className="px-6 py-5 border-b border-b1">
          <h1 className="text-t1 font-display text-xl font-semibold">Assistant Mibeko IA</h1>
          <p className="text-t3 text-sm mt-1">Posez vos questions juridiques avec citations</p>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto">
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-gold fill-none stroke-[1.5]">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-t2 text-sm font-medium">Assistant en construction</p>
            <p className="text-t3 text-xs max-w-xs">
              L&apos;assistant juridique IA sera disponible ici.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

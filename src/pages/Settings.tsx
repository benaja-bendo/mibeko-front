import { useEffect, useState } from 'react';
import { useAuthStore } from "@/features/auth/store/authStore";
import { getPythonHealth } from '@/features/ingestion/api/pythonApi';
import { laravelClient } from '@/shared/api/laravelClient';
import AppLayout from '@/shared/components/layout/AppLayout';

type BackendStatus = 'checking' | 'ok' | 'error';

function useBackendHealth(fetcher: () => Promise<{ status: string }>, intervalMs = 30000) {
  const [status, setStatus] = useState<BackendStatus>('checking');

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetcher();
        if (alive) setStatus(res.status === 'ok' ? 'ok' : 'error');
      } catch {
        if (alive) setStatus('error');
      }
    };
    check();
    const id = setInterval(check, intervalMs);
    return () => { alive = false; clearInterval(id); };
  }, [fetcher, intervalMs]);

  return status;
}

const StatusBadge = ({ status, label, description }: { status: BackendStatus; label: string; description: string }) => (
  <div className="flex items-center justify-between p-4 bg-s1 border border-b1 rounded-xl">
    <div>
      <h3 className="text-sm font-semibold text-t1">{label}</h3>
      <p className="text-xs text-t3 mt-0.5">{description}</p>
    </div>
    <div className="flex items-center gap-2">
      <span className={[
        'w-2 h-2 rounded-full',
        status === 'ok' ? 'bg-green shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
        status === 'error' ? 'bg-red' : 'bg-amber animate-pulse'
      ].join(' ')} />
      <span className="text-xs font-mono text-t2 uppercase tracking-wider">
        {status === 'ok' ? 'En ligne' : status === 'error' ? 'Hors ligne' : 'Vérification...'}
      </span>
    </div>
  </div>
);

export default function Settings() {
  const { user } = useAuthStore();
  const pythonStatus = useBackendHealth(getPythonHealth);

  const [laravelStatus, setLaravelStatus] = useState<BackendStatus>('checking');
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await laravelClient.get('/home');
        if (alive) setLaravelStatus(res.status === 200 ? 'ok' : 'error');
      } catch {
        if (alive) setLaravelStatus('error');
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 h-full overflow-y-auto">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold text-t1">Paramètres</h1>
          <p className="text-sm text-t3 mt-1">Gérez votre compte et vérifiez l'état du système.</p>
        </div>

        {/* Profil Utilisateur */}
        <section className="space-y-4">
          <h2 className="text-sm font-mono uppercase tracking-widest text-t4">Profil</h2>
          <div className="bg-s1 border border-b1 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold text-2xl font-display font-semibold shrink-0">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-semibold text-t1">{user?.name}</h3>
              <p className="text-sm text-t3">ID: {user?.id}</p>
            </div>
            <div className="px-3 py-1.5 bg-s2 border border-b1 rounded-md text-xs font-mono text-t2">
              Rôle : <span className="text-gold">{user?.roles?.join(', ')}</span>
            </div>
          </div>
        </section>

        {/* État du Système */}
        <section className="space-y-4">
          <h2 className="text-sm font-mono uppercase tracking-widest text-t4">État du Système</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusBadge 
              status={laravelStatus} 
              label="Service Principal" 
              description="Gestion des données et authentification"
            />
            <StatusBadge 
              status={pythonStatus} 
              label="Service d'Analyse" 
              description="Extraction IA et traitement des documents"
            />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

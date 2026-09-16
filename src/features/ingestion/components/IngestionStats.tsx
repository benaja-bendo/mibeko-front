/**
 * IngestionStats.tsx — Santé du service Python affichée dans l'en-tête de la
 * boîte de réception.
 */
import { useQuery } from '@tanstack/react-query';
import { getPythonHealth } from '../api/pythonApi';

export function ServiceHealth() {
  const { data: health, isError } = useQuery({
    queryKey: ['python-health'],
    queryFn: getPythonHealth,
    refetchInterval: 30000,
    retry: false,
  });

  const ok = !isError && health?.status === 'ok' && health?.db === 'ok';
  const label = isError ? 'Service injoignable' : health?.db !== 'ok' ? 'Base de données KO' : 'Service opérationnel';

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-t3">
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green' : 'bg-red animate-pulse'}`} />
      {label}
    </span>
  );
}

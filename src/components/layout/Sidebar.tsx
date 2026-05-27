/**
 * Sidebar.tsx — Navigation latérale principale du tableau de bord Mibeko.
 * Affiche les liens de navigation + statut en temps réel des deux backends.
 */
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getPythonHealth } from '../../services/pythonApi';

// ---------------------------------------------------------------------------
// Health badge
// ---------------------------------------------------------------------------
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

const StatusDot = ({ status, label }: { status: BackendStatus; label: string }) => (
  <div className="flex items-center gap-1.5 text-[10px] font-mono text-t3">
    <span className={[
      'w-1.5 h-1.5 rounded-full shrink-0',
      status === 'ok' ? 'bg-green animate-[pulse_2s_ease-in-out_infinite]' :
      status === 'error' ? 'bg-red' : 'bg-amber animate-pulse'
    ].join(' ')} />
    {label}
  </div>
);

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  {
    to: '/',
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    label: 'Dashboard',
  },
  {
    to: '/catalogue',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8M8 11h5" />
      </svg>
    ),
    label: 'Catalogue',
  },
  {
    to: '/ingestion',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    label: 'Ingestion',
  },
  {
    to: '/viewer',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    label: 'Éditeur',
  },
];

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------
export default function Sidebar() {
  const location = useLocation();
  const pythonStatus = useBackendHealth(getPythonHealth);

  // Laravel health via simple fetch
  const [laravelStatus, setLaravelStatus] = useState<BackendStatus>('checking');
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch('/api/v1/home', { headers: { 'Accept': 'application/json' } });
        if (alive) setLaravelStatus(res.ok ? 'ok' : 'error');
      } catch {
        if (alive) setLaravelStatus('error');
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <aside className="w-[200px] shrink-0 flex flex-col h-full bg-s1 border-r border-b1 select-none">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-b1">
        <div className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-gold fill-none stroke-[1.5]">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <div className="text-t1 font-display text-sm font-semibold leading-none">Mibeko</div>
          <div className="text-t3 font-mono text-[10px] mt-0.5">LegalTech</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        <div className="text-[10px] font-mono uppercase tracking-widest text-t4 px-2 mb-2">Navigation</div>
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={[
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-body transition-all duration-150 group',
                isActive
                  ? 'bg-gold/10 text-gold border border-gold/15'
                  : 'text-t2 hover:bg-s2 hover:text-t1 border border-transparent',
              ].join(' ')}
            >
              <span className={isActive ? 'text-gold' : 'text-t3 group-hover:text-t2'}>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Backend status */}
      <div className="p-3 border-t border-b1 space-y-1.5">
        <div className="text-[10px] font-mono uppercase tracking-widest text-t4 mb-1.5">Backends</div>
        <StatusDot status={laravelStatus} label="Laravel :8000" />
        <StatusDot status={pythonStatus} label="Python :8001" />
      </div>
    </aside>
  );
}

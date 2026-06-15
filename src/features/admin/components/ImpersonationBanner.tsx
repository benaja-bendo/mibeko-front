import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { logout } from '@/features/auth/api/authApi';
import { ShieldAlert, LogOut } from 'lucide-react';

/**
 * Bandeau « mode support » affiché tant qu'un admin agit au nom d'un autre
 * utilisateur. « Quitter » révoque le jeton d'impersonation et rétablit la
 * session admin.
 */
export default function ImpersonationBanner() {
  const navigate = useNavigate();
  const impersonator = useAuthStore((s) => s.impersonator);
  const activeUser = useAuthStore((s) => s.user);
  const stopImpersonation = useAuthStore((s) => s.stopImpersonation);
  const [leaving, setLeaving] = React.useState(false);

  if (!impersonator) return null;

  const handleStop = async () => {
    setLeaving(true);
    // Révoque le jeton d'impersonation courant (best-effort), puis rétablit l'admin.
    try {
      await logout();
    } catch {
      /* on rétablit l'admin même si la révocation réseau échoue */
    }
    stopImpersonation();
    navigate('/admin/utilisateurs');
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-gold/15 border-b border-gold/30 text-t1">
      <div className="flex items-center gap-2 text-[12px] min-w-0">
        <ShieldAlert className="w-4 h-4 text-gold shrink-0" />
        <span className="truncate">
          Mode support — vous agissez en tant que{' '}
          <span className="font-semibold">{activeUser?.name ?? 'utilisateur'}</span>
          <span className="text-t3 hidden sm:inline"> · admin : {impersonator.user.name}</span>
        </span>
      </div>
      <button
        onClick={handleStop}
        disabled={leaving}
        className="flex items-center gap-1.5 text-[12px] rounded-md px-2.5 py-1 bg-gold text-bg font-medium hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
      >
        <LogOut className="w-3.5 h-3.5" />
        {leaving ? 'Sortie…' : 'Quitter'}
      </button>
    </div>
  );
}

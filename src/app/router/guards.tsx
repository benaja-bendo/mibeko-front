import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import UnauthorizedPage from '@/features/auth/components/UnauthorizedPage';
import { type UserRole } from '@/shared/types/auth';
import { defaultRedirectFor } from '@/features/auth/redirect';

interface RequireAuthProps {
  children: React.ReactNode;
  /** Rôles autorisés. Si absent, tout utilisateur authentifié passe. */
  roles?: UserRole[];
  /** Rôle affiché dans la page 403 pour orienter l'utilisateur */
  requiredRole?: 'editor' | 'user_pro' | 'admin';
}

export function RequireAuth({ children, roles, requiredRole }: RequireAuthProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && user && !roles.some((r) => user.roles?.includes(r))) {
    // Authentifié mais rôle insuffisant → page 403 orientée
    const inferredRequired = requiredRole ?? (roles.includes('admin') ? 'admin' : roles.includes('editor') ? 'editor' : 'user_pro');
    return <UnauthorizedPage requiredRole={inferredRequired} />;
  }

  return <>{children}</>;
}

export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    return <Navigate to={defaultRedirectFor(user)} replace />;
  }

  return <>{children}</>;
}

/**
 * Route racine « / » : oriente vers l'espace du rôle le plus élevé de
 * l'utilisateur. La règle est partagée avec la connexion et l'inscription
 * (`defaultRedirectFor`) pour qu'une même personne n'atterrisse pas à deux
 * endroits différents selon le chemin emprunté. Les visiteurs non connectés
 * partent directement vers le login.
 */
export function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  return <Navigate to={defaultRedirectFor(user)} replace />;
}

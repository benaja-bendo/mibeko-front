import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { fetchMe } from '@/features/auth/api/authApi';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { token, setUser, clearAuth, markInitialized, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!token) {
      markInitialized();
      return;
    }

    // Validate token and refresh user data on app start
    fetchMe()
      .then((user) => setUser(user))
      .catch(() => clearAuth())
      .finally(() => markInitialized());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg text-gold font-mono text-xs tracking-widest uppercase">
        Chargement…
      </div>
    );
  }

  return <>{children}</>;
}

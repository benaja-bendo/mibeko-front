import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { login } from '@/features/auth/api/authApi';
import { defaultRedirectFor } from '@/features/auth/redirect';
import logoMibeko from '@/assets/logo_mibeko.svg';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const from = (location.state as { from?: string })?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { token, user } = await login({ email, password });
      setAuth(user, token);

      const destination = from ?? defaultRedirectFor(user);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
            <img src={logoMibeko} alt="Mibeko Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-t1 font-display text-xl font-semibold leading-tight">Mibeko</div>
            <div className="text-t3 font-mono text-[10px] uppercase tracking-widest">LegalTech</div>
          </div>
        </div>

        <div className="bg-s1 border border-b1 rounded-xl p-6 space-y-5">
          <div>
            <h1 className="text-t1 font-display text-lg font-semibold">Connexion</h1>
            <p className="text-t3 text-sm mt-1">Accédez à votre espace Mibeko</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-t2 text-xs font-medium tracking-wide uppercase">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="vous@exemple.com"
                className="w-full bg-s2 border border-b1 rounded-lg px-3 py-2.5 text-t1 text-sm placeholder:text-t3 focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-t2 text-xs font-medium tracking-wide uppercase">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-s2 border border-b1 rounded-lg px-3 py-2.5 pr-11 text-t1 text-sm placeholder:text-t3 focus:outline-none focus:border-gold/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
                  title={
                    showPassword
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-t3 transition-colors hover:bg-s3 hover:text-t1"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-bg font-medium text-sm rounded-lg px-4 py-2.5 hover:bg-gold/90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

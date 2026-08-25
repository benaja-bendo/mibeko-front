import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { login } from '@/features/auth/api/authApi';
import { defaultRedirectFor } from '@/features/auth/redirect';
import AuthShell from './AuthShell';
import PasswordField from './PasswordField';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const state = location.state as { from?: string; notice?: string } | null;
  const from = state?.from;
  const notice = state?.notice;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <AuthShell
      title="Connexion"
      subtitle="Accédez à votre espace Mibeko"
      footer={
        <>
          <p>
            Pas encore de compte ?{' '}
            <Link to="/auth/register" className="text-gold hover:underline">
              Créer un compte
            </Link>
          </p>
          <p>
            <Link to="/auth/mot-de-passe-oublie" className="text-gold hover:underline">
              Mot de passe oublié ?
            </Link>
          </p>
        </>
      }
    >
      {notice && (
        <p
          role="status"
          className="text-t2 text-sm bg-s2 border border-b1 rounded-lg px-3 py-2.5"
        >
          {notice}
        </p>
      )}

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

        <PasswordField
          label="Mot de passe"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        {error && (
          <p
            role="alert"
            className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
          >
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
    </AuthShell>
  );
}

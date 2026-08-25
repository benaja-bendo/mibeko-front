import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '@/features/auth/api/authApi';
import AuthShell from './AuthShell';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Le serveur répond la même chose que le compte existe ou non : on
      // restitue son message tel quel. Adapter le texte au résultat réel
      // transformerait cet écran en outil d'énumération d'adresses.
      const message = await forgotPassword(email);
      setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Nous vous envoyons un code à six chiffres, valable quinze minutes."
      footer={
        <p>
          <Link to="/auth/login" className="text-gold hover:underline">
            Revenir à la connexion
          </Link>
        </p>
      }
    >
      {notice ? (
        <div className="space-y-4">
          <p
            role="status"
            className="text-t2 text-sm bg-s2 border border-b1 rounded-lg px-3 py-2.5 leading-relaxed"
          >
            {notice}
          </p>
          <button
            type="button"
            onClick={() =>
              navigate(`/auth/reinitialiser?email=${encodeURIComponent(email)}`)
            }
            className="w-full bg-gold text-bg font-medium text-sm rounded-lg px-4 py-2.5 hover:bg-gold/90 active:scale-[0.99] transition-all"
          >
            J'ai reçu mon code
          </button>
        </div>
      ) : (
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
            {loading ? 'Envoi…' : 'Recevoir un code'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

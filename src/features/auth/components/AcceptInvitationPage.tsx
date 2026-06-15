import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { acceptInvitation } from '@/features/admin/api/usersApi';
import { isEditorOrAbove, type User } from '@/shared/types/auth';
import logoMibeko from '@/assets/logo_mibeko.svg';

function getDefaultRedirect(user: User | null): string {
  if (!user) return '/auth/login';
  if (isEditorOrAbove(user)) return '/editor';
  return '/app/library';
}

export default function AcceptInvitationPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setAuth } = useAuthStore();

  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const invalidLink = !email || !token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const { token: authToken, user } = await acceptInvitation({
        email,
        token,
        name,
        password,
        password_confirmation: confirm,
      });
      setAuth(user, authToken);
      navigate(getDefaultRedirect(user), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de finaliser l\'invitation.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
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
            <h1 className="text-t1 font-display text-lg font-semibold">Rejoindre l'équipe</h1>
            <p className="text-t3 text-sm mt-1">
              {invalidLink ? 'Lien d\'invitation invalide.' : `Créez votre compte pour ${email}`}
            </p>
          </div>

          {invalidLink ? (
            <button
              onClick={() => navigate('/auth/login')}
              className="w-full bg-gold text-bg font-medium text-sm rounded-lg px-4 py-2.5 hover:bg-gold/90 transition-all"
            >
              Aller à la connexion
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-t2 text-xs font-medium tracking-wide uppercase">Nom complet</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Jean Dupont"
                  className="w-full bg-s2 border border-b1 rounded-lg px-3 py-2.5 text-t1 text-sm placeholder:text-t3 focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-t2 text-xs font-medium tracking-wide uppercase">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Min. 8 caractères"
                    className="w-full bg-s2 border border-b1 rounded-lg px-3 py-2.5 pr-11 text-t1 text-sm placeholder:text-t3 focus:outline-none focus:border-gold/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-t3 transition-colors hover:bg-s3 hover:text-t1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-t2 text-xs font-medium tracking-wide uppercase">Confirmer le mot de passe</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full bg-s2 border border-b1 rounded-lg px-3 py-2.5 text-t1 text-sm placeholder:text-t3 focus:outline-none focus:border-gold/50 transition-colors"
                />
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
                {loading ? 'Création…' : 'Créer mon compte'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

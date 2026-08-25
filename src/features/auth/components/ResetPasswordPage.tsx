import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '@/features/auth/api/authApi';
import AuthShell from './AuthShell';
import PasswordField from './PasswordField';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // L'adresse est reprise de l'écran précédent quand elle y a été saisie,
  // pour ne pas la redemander ; elle reste modifiable.
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({
        email,
        code,
        password,
        password_confirmation: confirmation,
      });
      // Le serveur révoque toutes les sessions existantes : on repasse
      // nécessairement par la connexion.
      navigate('/auth/login', {
        replace: true,
        state: { notice: 'Mot de passe modifié. Vous pouvez vous connecter.' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réinitialisation impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Nouveau mot de passe"
      subtitle="Saisissez le code reçu par e-mail, puis choisissez un nouveau mot de passe."
      footer={
        <>
          <p>
            <Link to="/auth/mot-de-passe-oublie" className="text-gold hover:underline">
              Demander un nouveau code
            </Link>
          </p>
          <p>
            <Link to="/auth/login" className="text-gold hover:underline">
              Revenir à la connexion
            </Link>
          </p>
        </>
      }
    >
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
            Code reçu par e-mail
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            autoComplete="one-time-code"
            placeholder="123456"
            className="w-full bg-s2 border border-b1 rounded-lg px-3 py-2.5 text-t1 text-sm font-mono tracking-[0.3em] placeholder:tracking-normal placeholder:text-t3 focus:outline-none focus:border-gold/50 transition-colors"
          />
          <p className="text-t3 text-xs">Six chiffres, valables quinze minutes.</p>
        </div>

        <PasswordField
          label="Nouveau mot de passe"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={8}
          hint="8 caractères au minimum."
        />

        <PasswordField
          label="Confirmer le mot de passe"
          value={confirmation}
          onChange={setConfirmation}
          autoComplete="new-password"
          toggleLabelSuffix="de confirmation"
          minLength={8}
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
          {loading ? 'Modification…' : 'Changer mon mot de passe'}
        </button>
      </form>
    </AuthShell>
  );
}

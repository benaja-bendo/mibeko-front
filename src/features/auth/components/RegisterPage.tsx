import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { register } from '@/features/auth/api/authApi';
import { defaultRedirectFor } from '@/features/auth/redirect';
import AuthShell from './AuthShell';
import PasswordField from './PasswordField';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Contrôlé ici en plus du serveur : renvoyer l'utilisateur au bout d'un
    // aller-retour réseau pour une faute de frappe qu'on peut voir tout de
    // suite est une friction gratuite à l'inscription.
    if (password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      // L'API renvoie un jeton : on ouvre la session directement, sans
      // redemander les identifiants qui viennent d'être saisis.
      const { token, user } = await register({
        name,
        email,
        password,
        password_confirmation: confirmation,
      });
      setAuth(user, token);
      navigate(defaultRedirectFor(user), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création du compte impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="La lecture des textes reste libre et sans compte. Un compte sert à retrouver votre espace."
      footer={
        <p>
          Vous avez déjà un compte ?{' '}
          <Link to="/auth/login" className="text-gold hover:underline">
            Se connecter
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-t2 text-xs font-medium tracking-wide uppercase">Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
            autoComplete="name"
            placeholder="Votre nom"
            className="w-full bg-s2 border border-b1 rounded-lg px-3 py-2.5 text-t1 text-sm placeholder:text-t3 focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-t2 text-xs font-medium tracking-wide uppercase">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={255}
            autoComplete="email"
            placeholder="vous@exemple.com"
            className="w-full bg-s2 border border-b1 rounded-lg px-3 py-2.5 text-t1 text-sm placeholder:text-t3 focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        <PasswordField
          label="Mot de passe"
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
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>

        <p className="text-t3 text-xs leading-relaxed">
          En créant un compte, vous acceptez les{' '}
          <a
            href="https://mibeko.fr/cgu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            conditions générales d'utilisation
          </a>
          .
        </p>
      </form>
    </AuthShell>
  );
}

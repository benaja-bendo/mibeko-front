import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchMe, logout, resendEmailVerification } from '@/features/auth/api/authApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { redirectAfterRegistration } from '@/features/auth/redirect';
import { requiresEmailVerification } from '@/shared/types/auth';
import AuthShell from './AuthShell';

const POST_VERIFICATION_NEXT_KEY = 'mibeko:post-verification-next';

function rememberedDestination(next: string | null): string | null {
  try {
    if (next === 'assistant') {
      localStorage.setItem(POST_VERIFICATION_NEXT_KEY, next);
      return next;
    }

    return localStorage.getItem(POST_VERIFICATION_NEXT_KEY) === 'assistant' ? 'assistant' : null;
  } catch {
    return next === 'assistant' ? next : null;
  }
}

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const intendedDestination = useRef(rememberedDestination(searchParams.get('next')));
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const continueAfterVerification = useCallback(() => {
    try {
      localStorage.removeItem(POST_VERIFICATION_NEXT_KEY);
    } catch {
      // Une navigation privée stricte ne doit pas bloquer la suite du parcours.
    }
    navigate(redirectAfterRegistration(user, intendedDestination.current), { replace: true });
  }, [navigate, user]);

  const checkVerification = useCallback(async () => {
    setChecking(true);
    setError(null);

    try {
      const refreshedUser = await fetchMe();
      setUser(refreshedUser);

      if (requiresEmailVerification(refreshedUser)) {
        setMessage('La validation n’est pas encore confirmée. Ouvrez le lien reçu par e-mail, puis réessayez.');
        return;
      }

      try {
        localStorage.removeItem(POST_VERIFICATION_NEXT_KEY);
      } catch {
        // Une navigation privée stricte ne doit pas bloquer la suite du parcours.
      }
      navigate(redirectAfterRegistration(refreshedUser, intendedDestination.current), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vérification impossible pour le moment.');
    } finally {
      setChecking(false);
    }
  }, [navigate, setUser]);

  useEffect(() => {
    if (user && !requiresEmailVerification(user)) {
      continueAfterVerification();
      return;
    }

    function handleFocus() {
      void checkVerification();
    }

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkVerification, continueAfterVerification, user]);

  async function handleResend() {
    setResending(true);
    setError(null);

    try {
      setMessage(await resendEmailVerification());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible pour le moment.');
    } finally {
      setResending(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      try {
        localStorage.removeItem(POST_VERIFICATION_NEXT_KEY);
      } catch {
        // Rien à nettoyer quand le stockage est indisponible.
      }
      clearAuth();
      navigate('/auth/login', { replace: true });
    }
  }

  return (
    <AuthShell
      title="Vérifiez votre adresse e-mail"
      subtitle={`Nous avons envoyé un lien de confirmation à ${user?.email ?? 'votre adresse e-mail'}.`}
      footer={
        <button type="button" className="text-t3 hover:text-t1 underline" onClick={handleLogout}>
          Utiliser un autre compte
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-t2">
          Ouvrez le lien reçu, puis revenez ici. Votre onboarding commencera dès que l’adresse sera confirmée.
        </p>

        {message && <p role="status" className="rounded-lg border border-b1 bg-s2 px-3 py-2 text-xs text-t2">{message}</p>}
        {error && <p role="alert" className="rounded-lg border border-red/20 bg-red-d px-3 py-2 text-xs text-red">{error}</p>}

        <button
          type="button"
          disabled={checking}
          onClick={() => void checkVerification()}
          className="w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-on-gold transition-opacity disabled:opacity-50"
        >
          {checking ? 'Vérification…' : 'J’ai vérifié mon adresse'}
        </button>

        <button
          type="button"
          disabled={resending}
          onClick={() => void handleResend()}
          className="w-full rounded-lg border border-b2 px-4 py-2.5 text-sm font-medium text-t2 transition-colors hover:bg-s2 disabled:opacity-50"
        >
          {resending ? 'Envoi…' : 'Renvoyer l’e-mail'}
        </button>
      </div>
    </AuthShell>
  );
}

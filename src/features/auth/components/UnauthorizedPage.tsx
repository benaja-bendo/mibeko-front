import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { isEditorOrAbove } from '@/shared/types/auth';
import logoMibeko from '@/assets/logo_mibeko.svg';

interface UnauthorizedPageProps {
  /** Le rôle minimum requis pour accéder à cette page */
  requiredRole?: 'editor' | 'user_pro' | 'admin';
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  editor: 'Éditeur',
  user_pro: 'Abonné Pro',
};

const UPGRADE_PATHS: Record<string, { title: string; steps: string[]; cta?: string; ctaHref?: string }> = {
  editor: {
    title: 'Accès réservé à l\'équipe éditoriale',
    steps: [
      'Cet espace est réservé aux administrateurs et éditeurs Mibeko.',
      'Si vous êtes un collaborateur, contactez l\'administrateur pour qu\'il vous attribue le rôle Éditeur.',
      'Si vous êtes abonné Pro, votre espace est accessible via l\'onglet Pro.',
    ],
    cta: 'Aller à mon espace Pro',
    ctaHref: '/app/library',
  },
  user_pro: {
    title: 'Fonctionnalité réservée aux abonnés Pro',
    steps: [
      'Cet espace est réservé aux professionnels abonnés à Mibeko Pro.',
      'Avec Mibeko Pro vous accédez à la bibliothèque juridique complète, l\'assistant IA avec citations et la gestion de dossiers.',
      'Passez à Pro pour débloquer toutes ces fonctionnalités.',
    ],
    cta: 'Découvrir Mibeko Pro',
    ctaHref: '/app/upgrade',
  },
  admin: {
    title: 'Accès réservé aux administrateurs',
    steps: [
      'Cet espace est réservé aux administrateurs de la plateforme.',
      'Contactez l\'équipe Mibeko si vous pensez y avoir droit.',
    ],
  },
  guest: {
    title: 'Bienvenue sur Mibeko LegalTech',
    steps: [
      'Votre compte a été créé avec succès, mais aucun accès spécifique ne vous a encore été attribué.',
      'Si vous êtes un professionnel du droit, vous pouvez découvrir nos offres Pro.',
      'Si vous faites partie de l\'équipe, veuillez contacter un administrateur.',
    ],
    cta: 'Découvrir nos offres',
    ctaHref: '/app/upgrade',
  }
};

export default function UnauthorizedPage({ requiredRole = 'user_pro' }: UnauthorizedPageProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Si l'utilisateur n'a aucun rôle, on affiche la vue guest
  const hasNoRole = !user?.roles || user.roles.length === 0;
  const infoKey = hasNoRole ? 'guest' : requiredRole;
  const info = UPGRADE_PATHS[infoKey] ?? UPGRADE_PATHS.user_pro;
  const userRoleLabel = user?.roles?.[0] ? (ROLE_LABELS[user.roles[0]] ?? user.roles[0]) : 'Utilisateur standard';

  function handleBack() {
    if (user && isEditorOrAbove(user)) {
      navigate('/editor');
    } else {
      navigate('/app/library');
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Logo */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
          <img src={logoMibeko} alt="Mibeko Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="text-t1 font-display text-lg font-semibold leading-tight">Mibeko</div>
          <div className="text-t3 font-mono text-[10px] uppercase tracking-widest">LegalTech</div>
        </div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Icône */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-s1 border border-b1 shadow-xl shadow-bg flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-2xl border border-gold/20" />
            {hasNoRole ? (
              <svg viewBox="0 0 24 24" className="w-10 h-10 stroke-gold fill-none stroke-[1.5]">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-10 h-10 stroke-amber-400 fill-none stroke-[1.5]">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </div>
        </div>

        {/* Titre */}
        <div className="text-center space-y-2">
          <h1 className="text-t1 font-display text-2xl font-semibold">{info.title}</h1>
          {user && (
            <p className="text-t3 text-sm flex items-center justify-center gap-2">
              Connecté en tant que
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-widest font-medium bg-s2 border border-b1 text-t1">
                {userRoleLabel}
              </span>
            </p>
          )}
        </div>

        {/* Étapes */}
        <div className="bg-s1/80 backdrop-blur-sm border border-b1 rounded-2xl p-6 space-y-4 shadow-sm">
          {info.steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-gold text-[10px] font-mono font-bold">{i + 1}</span>
              </div>
              <p className="text-t2 text-sm leading-relaxed">{step}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          {info.cta && info.ctaHref && (
            <button
              onClick={() => navigate(info.ctaHref!)}
              className="w-full h-12 bg-gold text-[#120e00] font-semibold text-sm rounded-xl px-4 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg shadow-gold/20"
            >
              {info.cta}
            </button>
          )}
          <button
            onClick={handleBack}
            className="w-full h-12 bg-s1 border border-b1 text-t2 font-medium text-sm rounded-xl px-4 hover:bg-s2 hover:text-t1 transition-all"
          >
            {hasNoRole ? 'Accéder à l\'espace public' : 'Retourner à mon espace'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { isProOrAbove } from '@/shared/types/auth';
import { SettingsCard } from './SettingsCard';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=cg.mibeko.app';
const APP_STORE_URL = 'https://apps.apple.com/app/id6768865781';

/**
 * État de l'offre du compte, en tête de l'écran « Compte ».
 *
 * C'est le premier écran que voit une personne qui vient de s'inscrire : la
 * connexion, l'inscription et la racine y mènent désormais tout compte sans
 * abonnement, à la place de `/app*` qui répondait « Fonctionnalité réservée
 * aux abonnés Pro » — un refus en guise d'accueil.
 *
 * Aucun prix n'est affiché : l'encaissement se fait à la main et Stripe est
 * désactivé (décision du 01/08/2026). La carte dit où l'on en est et ce que le
 * compte permet aujourd'hui, sans rien promettre.
 */
export function PlanCard() {
  const user = useAuthStore((s) => s.user);
  const isPro = isProOrAbove(user);

  return (
    <SettingsCard
      title="Votre offre"
      description="Ce que votre compte donne aujourd'hui."
      action={
        <span className="inline-flex items-center rounded-md border border-b1 bg-s2 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-t2">
          {isPro ? 'Pro' : 'Gratuit'}
        </span>
      }
    >
      {isPro ? (
        <p className="text-sm text-t2 leading-relaxed">
          Votre abonnement professionnel est actif : recherche avancée, Assistant Mibeko, dossiers et
          suivi des échéances.
        </p>
      ) : (
        <>
          <p className="text-sm text-t2 leading-relaxed">
            La lecture des textes officiels est libre et le restera, avec ou sans compte, sur{' '}
            <a
              href="https://mibeko.fr/textes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              mibeko.fr
            </a>
            .
          </p>
          <p className="text-sm text-t2 leading-relaxed">
            C'est dans l'application mobile que votre compte sert le plus : lecture hors connexion,
            textes gardés de côté et alertes du Journal officiel.{' '}
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              Google Play
            </a>{' '}
            ·{' '}
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              App Store
            </a>
          </p>
          <p className="text-sm text-t3 leading-relaxed">
            Vous exercez le droit ?{' '}
            <Link to="/app/upgrade" className="text-gold hover:underline">
              Découvrir l'offre professionnelle
            </Link>
          </p>
        </>
      )}
    </SettingsCard>
  );
}

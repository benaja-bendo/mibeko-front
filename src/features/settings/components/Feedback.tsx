import { cn } from '@/shared/lib/utils';

type FeedbackKind = 'success' | 'error';

interface FeedbackProps {
  kind: FeedbackKind;
  message: string;
  className?: string;
}

/**
 * Bandeau de retour inline (succès / erreur) pour les formulaires Paramètres.
 *
 * Le projet n'a pas de système de toast ; on suit donc le pattern de feedback
 * inline déjà utilisé sur l'écran de connexion.
 */
export function Feedback({ kind, message, className }: FeedbackProps) {
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'text-xs rounded-lg px-3 py-2 border',
        kind === 'success'
          ? 'text-green bg-green-d border-green/20'
          : 'text-red bg-red-d border-red/20',
        className,
      )}
    >
      {message}
    </p>
  );
}

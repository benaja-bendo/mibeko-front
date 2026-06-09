import { cn } from '@/shared/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Libellé accessible (obligatoire si aucun label visible n'est associé). */
  'aria-label'?: string;
}

/**
 * Interrupteur on/off accessible, construit sans dépendance externe.
 *
 * Utilise `role="switch"` + `aria-checked` pour rester lisible par les lecteurs
 * d'écran ; le style suit le token `gold` pour l'état actif.
 */
export function Switch({ checked, onChange, disabled, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest['aria-label']}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-gold' : 'bg-s4',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  );
}

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  /**
   * Distingue les boutons œil quand plusieurs champs coexistent (mot de passe
   * et sa confirmation) : sans cela, deux boutons portent le même nom
   * accessible et deviennent indiscernables au clavier comme au test.
   */
  toggleLabelSuffix?: string;
  minLength?: number;
  hint?: string;
}

export default function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  toggleLabelSuffix,
  minLength,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const suffix = toggleLabelSuffix ? ` ${toggleLabelSuffix}` : '';

  return (
    <div className="space-y-1.5">
      <label className="text-t2 text-xs font-medium tracking-wide uppercase">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className="w-full bg-s2 border border-b1 rounded-lg px-3 py-2.5 pr-11 text-t1 text-sm placeholder:text-t3 focus:outline-none focus:border-gold/50 transition-colors"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={(visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe') + suffix}
          title={(visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe') + suffix}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-t3 transition-colors hover:bg-s3 hover:text-t1"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-t3 text-xs">{hint}</p>}
    </div>
  );
}

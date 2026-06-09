import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface RecoveryCodesProps {
  codes: string[];
  hint?: string;
}

/**
 * Affiche les codes de récupération 2FA avec une action « copier ».
 *
 * Les codes ne sont montrés qu'au moment de leur génération : on incite donc à
 * les sauvegarder via le `hint`.
 */
export function RecoveryCodes({ codes, hint }: RecoveryCodesProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <div className="relative bg-s2 border border-b1 rounded-lg p-3">
        <button
          type="button"
          onClick={copy}
          className="absolute top-2 right-2 inline-flex items-center gap-1 text-[11px] text-t3 hover:text-t1 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copié' : 'Copier'}
        </button>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs text-t1 pr-16">
          {codes.map((code) => (
            <span key={code}>{code}</span>
          ))}
        </div>
      </div>
      {hint && <p className="text-[11px] text-t3 leading-relaxed">{hint}</p>}
    </div>
  );
}

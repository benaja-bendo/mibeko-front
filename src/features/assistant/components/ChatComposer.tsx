/**
 * ChatComposer.tsx — Zone de composition du message.
 *
 * Ergonomie pensée pour un usage intensif :
 *  - textarea qui grandit automatiquement (jusqu'à une limite) ;
 *  - Entrée envoie, Maj+Entrée insère un saut de ligne ;
 *  - bascule Envoyer / Stop selon l'état du streaming.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface ChatComposerProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

const MAX_HEIGHT = 200;

export default function ChatComposer({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: ChatComposerProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ajuste la hauteur du textarea au contenu (auto-grow plafonné).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || isStreaming || disabled) return;
    onSend(text);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-b1 bg-bg px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-b1 bg-s1 p-2 shadow-sm transition-colors focus-within:border-gold/40">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
            placeholder="Posez une question juridique (Code du travail, OHADA, jurisprudence…)"
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed text-t1 placeholder:text-t3 focus:outline-none disabled:opacity-50"
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              title="Arrêter la génération"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-s3 text-t1 transition-colors hover:bg-s4"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!value.trim() || disabled}
              title="Envoyer (Entrée)"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold text-on-gold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="mt-1.5 px-1 text-[10px] text-t4">
          Mibeko IA peut se tromper. Vérifiez les informations critiques via les
          sources citées. <span className="text-t3">Entrée</span> pour envoyer,{' '}
          <span className="text-t3">Maj+Entrée</span> pour un saut de ligne.
        </p>
      </div>
    </div>
  );
}

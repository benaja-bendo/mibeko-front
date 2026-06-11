/**
 * ChatComposer.tsx — Zone de composition du message.
 *
 * Ergonomie pensée pour un usage intensif par des professionnels du droit :
 *  - textarea qui grandit automatiquement (jusqu'à une limite) ;
 *  - Entrée envoie, Maj+Entrée insère un saut de ligne ;
 *  - bascule Envoyer / Stop selon l'état du streaming ;
 *  - mode de réponse : « Directe » (courte, par défaut) ou « Analyse » ;
 *  - références « @ » : épingler des textes (codes, lois…) pour restreindre
 *    la recherche de l'IA — les épingles restent actives entre les messages.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, AtSign, Layers, Square, X, Zap } from 'lucide-react';
import ReferencePicker from './ReferencePicker';
import type {
  AssistantMode,
  AssistantReference,
  SendMessageOptions,
} from '@/features/assistant/types';

interface ChatComposerProps {
  onSend: (text: string, options: SendMessageOptions) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

const MAX_HEIGHT = 200;

const MODES: {
  value: AssistantMode;
  label: string;
  title: string;
  icon: typeof Zap;
}[] = [
  {
    value: 'concise',
    label: 'Directe',
    title: 'Réponse courte et sourcée (par défaut)',
    icon: Zap,
  },
  {
    value: 'analysis',
    label: 'Analyse',
    title: 'Analyse structurée : fondements, exceptions, points de vigilance',
    icon: Layers,
  },
];

export default function ChatComposer({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: ChatComposerProps) {
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<AssistantMode>('concise');
  const [references, setReferences] = useState<AssistantReference[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
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
    onSend(text, { mode, references });
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  /** Taper « @ » ouvre le sélecteur ; le caractère est retiré à la sélection. */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    if (next.length > value.length && next.endsWith('@')) {
      setPickerOpen(true);
      setValue(next.slice(0, -1));
      return;
    }
    setValue(next);
  };

  const addReference = (reference: AssistantReference) => {
    setReferences((prev) =>
      prev.some((r) => r.id === reference.id) ? prev : [...prev, reference],
    );
    textareaRef.current?.focus();
  };

  const removeReference = (id: string) => {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="border-t border-b1 bg-bg px-4 py-3">
      <div className="relative mx-auto max-w-3xl">
        <ReferencePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={addReference}
          selectedIds={references.map((r) => r.id)}
        />

        <div className="rounded-2xl border border-b1 bg-s1 p-2 shadow-sm transition-colors focus-within:border-gold/40">
          {/* Références épinglées : périmètre actif de la recherche IA */}
          {references.length > 0 && (
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5 px-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-t4">
                Recherche ciblée
              </span>
              {references.map((ref) => (
                <span
                  key={ref.id}
                  className="flex max-w-[240px] items-center gap-1 rounded-full border border-gold/25 bg-gold/10 py-0.5 pl-2 pr-1 text-[11px] text-t1"
                >
                  <span className="truncate">{ref.title}</span>
                  <button
                    type="button"
                    onClick={() => removeReference(ref.id)}
                    title={`Retirer ${ref.title}`}
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-t3 transition-colors hover:bg-gold/20 hover:text-t1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={disabled}
              placeholder="Posez une question juridique — tapez @ pour cibler un texte précis"
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed text-t1 placeholder:text-t3 focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Barre d'actions : références, mode de réponse, envoi */}
          <div className="mt-1 flex items-center gap-1.5 px-1">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              disabled={disabled}
              title="Cibler la recherche sur un texte (ou tapez @)"
              className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                references.length > 0
                  ? 'border-gold/30 bg-gold/10 text-gold'
                  : 'border-b1 text-t3 hover:bg-s2 hover:text-t1'
              }`}
            >
              <AtSign className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center rounded-lg border border-b1 p-0.5">
              {MODES.map(({ value: modeValue, label, title, icon: Icon }) => (
                <button
                  key={modeValue}
                  type="button"
                  onClick={() => setMode(modeValue)}
                  title={title}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    mode === modeValue
                      ? 'bg-gold/15 text-gold'
                      : 'text-t3 hover:text-t1'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1" />

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

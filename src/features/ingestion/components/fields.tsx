/**
 * fields.tsx — Champs de formulaire partagés de la feature ingestion.
 */
import React from 'react';

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-mono uppercase tracking-widest text-t3 mb-1.5">
        {label} {required && <span className="text-gold">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full h-9 bg-s2 border border-b1 rounded-md text-t1 px-3 text-sm font-body outline-none transition-colors focus:border-gold/40 placeholder:text-t4';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" {...props} className={`${inputCls} ${props.className || ''}`} />;
}

export function DateInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="date" {...props} className={`${inputCls} font-mono text-xs ${props.className || ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputCls} cursor-pointer ${props.className || ''}`}>
      {props.children}
    </select>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-red text-xs font-mono bg-red/8 border border-red/20 rounded-md px-3 py-2">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 stroke-current fill-none stroke-2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      {message}
    </div>
  );
}

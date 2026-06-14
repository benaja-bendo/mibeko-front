/**
 * FilePicker.tsx — Sélecteurs de fichiers de la feature ingestion :
 * grande dropzone PDF (drag & drop) et sélecteur compact pour artefacts MD/JSON.
 */
import React, { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Dropzone PDF
// ---------------------------------------------------------------------------

export function PdfDropzone({
  id,
  file,
  onChange,
}: {
  id: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files).find((f) => f.type === 'application/pdf');
      if (dropped) onChange(dropped);
    },
    [onChange]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById(id)?.click()}
      className={[
        'relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer',
        isDragging ? 'border-gold/50 bg-gold/5' : 'border-b2 hover:border-b3 hover:bg-s2',
      ].join(' ')}
    >
      <input
        id={id}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      {file ? (
        <div className="flex items-center justify-center gap-2 text-green text-sm font-mono">
          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.5] shrink-0">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span className="truncate">{file.name}</span>
          <span className="text-t3 shrink-0">({(file.size / 1024 / 1024).toFixed(1)} Mo)</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="text-t3 hover:text-red font-mono shrink-0"
            title="Retirer le fichier"
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-t3 fill-none stroke-[1.5] mx-auto mb-1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-t2 text-sm font-body">
            Glissez le PDF source ici ou <span className="text-gold">parcourez</span>
          </p>
          <p className="text-t3 text-xs font-mono mt-0.5">PDF d'origine — obligatoire</p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sélecteur compact pour artefacts (MD / JSON)
// ---------------------------------------------------------------------------

export function ArtifactPicker({
  id,
  label,
  accept,
  file,
  onChange,
}: {
  id: string;
  label: string;
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <div
      onClick={() => !file && document.getElementById(id)?.click()}
      className={[
        'flex items-center gap-2 h-9 px-3 rounded-md border text-xs font-mono transition-colors',
        file
          ? 'border-green/25 bg-green/8 text-green'
          : 'border-b1 border-dashed bg-s2 text-t3 hover:border-b3 hover:text-t2 cursor-pointer',
      ].join(' ')}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      {file ? (
        <>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2 shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="truncate flex-1">{file.name}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="opacity-60 hover:opacity-100 shrink-0"
            title="Retirer"
          >
            ✕
          </button>
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.5] shrink-0">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{label}</span>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sélecteur compact MULTI-fichiers (morceaux MD / JSON d'un PDF découpé)
// ---------------------------------------------------------------------------

export function ArtifactMultiPicker({
  id,
  label,
  accept,
  files,
  onChange,
}: {
  id: string;
  label: string;
  accept: string;
  files: File[];
  onChange: (f: File[]) => void;
}) {
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      // Dédoublonnage par nom + taille (évite les ajouts en double)
      if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    onChange(next);
  };
  const removeAt = (index: number) => onChange(files.filter((_, i) => i !== index));

  return (
    <div className="space-y-1.5">
      <div
        onClick={() => document.getElementById(id)?.click()}
        className="flex items-center gap-2 h-9 px-3 rounded-md border border-b1 border-dashed bg-s2 text-t3 hover:border-b3 hover:text-t2 cursor-pointer text-xs font-mono transition-colors"
      >
        <input
          id={id}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ''; }}
        />
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.5] shrink-0">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>{label}</span>
        {files.length > 0 && <span className="ml-auto text-green">{files.length}</span>}
      </div>

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}`}
              className="flex items-center gap-2 h-7 px-2.5 rounded border border-green/25 bg-green/8 text-green text-[11px] font-mono"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-2 shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="truncate flex-1">{f.name}</span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="opacity-60 hover:opacity-100 shrink-0"
                title="Retirer"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

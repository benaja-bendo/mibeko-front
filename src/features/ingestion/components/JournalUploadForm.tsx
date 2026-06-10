/**
 * JournalUploadForm.tsx — Dépôt d'un Journal Officiel (FLUX).
 * Le backend Python découpe le JO en actes unitaires (lois, décrets, arrêtés…)
 * et les ingère comme documents FLUX rattachés au journal.
 */
import React, { useState } from 'react';
import { uploadOfficialJournal } from '../api/pythonApi';
import { PdfDropzone, ArtifactPicker } from './FilePicker';
import { Field, TextInput, DateInput, ErrorNote } from './fields';
import { Spinner } from './badges';

export function JournalUploadForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [mdFile, setMdFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState('');
  const [publicationDate, setPublicationDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !title.trim() || !publicationDate) {
      setError('PDF, titre et date de publication sont requis.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('pdf_file', pdfFile);
      fd.append('title', title.trim());
      fd.append('publication_date', publicationDate);
      if (number.trim()) fd.append('number', number.trim());
      if (mdFile) fd.append('md_file', mdFile);
      if (jsonFile) fd.append('json_file', jsonFile);

      const res = await uploadOfficialJournal(fd);
      onSuccess(
        res.created_documents_count > 0
          ? `JO traité : ${res.created_documents_count} acte(s) extrait(s) et publié(s)`
          : 'JO déposé — extraction OCR lancée en arrière-plan'
      );
      setPdfFile(null); setMdFile(null); setJsonFile(null);
      setTitle(''); setNumber(''); setPublicationDate('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload du JO");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-2 text-blue text-xs font-body bg-blue/8 border border-blue/20 rounded-md px-3 py-2">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 mt-0.5 stroke-current fill-none stroke-2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          Le journal sera découpé automatiquement en actes unitaires (lois, décrets,
          arrêtés…), chacun ingéré comme texte de <span className="font-mono">FLUX</span>.
        </span>
      </div>

      <PdfDropzone id="jo-pdf-input" file={pdfFile} onChange={setPdfFile} />

      <Field label="Titre du journal" required>
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Journal Officiel de la République du Congo"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Numéro">
          <TextInput
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Ex : 1959-02"
            className="font-mono"
          />
        </Field>
        <Field label="Date de publication" required>
          <DateInput value={publicationDate} onChange={(e) => setPublicationDate(e.target.value)} />
        </Field>
      </div>

      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-t3 mb-1.5">
          Artefacts pré-traités <span className="text-t4 normal-case tracking-normal">(recommandé — évite l'OCR)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ArtifactPicker
            id="jo-md-input"
            label="Joindre le .md"
            accept=".md,text/markdown"
            file={mdFile}
            onChange={setMdFile}
          />
          <ArtifactPicker
            id="jo-json-input"
            label="Joindre le .json"
            accept=".json,application/json"
            file={jsonFile}
            onChange={setJsonFile}
          />
        </div>
      </div>

      {error && <ErrorNote message={error} />}

      <button
        type="submit"
        disabled={loading || !pdfFile || !title.trim() || !publicationDate}
        className="w-full h-9 bg-gold text-on-gold font-semibold text-sm rounded-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Spinner /> Traitement du JO…
          </>
        ) : (
          'Déposer le Journal Officiel'
        )}
      </button>
    </form>
  );
}

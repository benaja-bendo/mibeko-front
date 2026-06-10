/**
 * StockUploadForm.tsx — Dépôt d'un texte consolidé (STOCK) :
 * code de la famille, code du travail, constitution… Le PDF d'origine est
 * obligatoire ; les artefacts MD/JSON déjà préparés sont fortement recommandés
 * (ils court-circuitent l'OCR MinerU et permettent un parsing immédiat).
 */
import React, { useState } from 'react';
import { uploadDocument } from '../api/pythonApi';
import { PdfDropzone, ArtifactPicker } from './FilePicker';
import { Field, TextInput, DateInput, Select, ErrorNote } from './fields';
import { Spinner } from './badges';

export function StockUploadForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [mdFile, setMdFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [titre, setTitre] = useState('');
  const [stockCode, setStockCode] = useState('');
  const [legalScope, setLegalScope] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [typeCode, setTypeCode] = useState('');
  const [referenceNor, setReferenceNor] = useState('');
  const [dateSignature, setDateSignature] = useState('');
  const [datePublication, setDatePublication] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPdfFile(null); setMdFile(null); setJsonFile(null);
    setTitre(''); setStockCode(''); setLegalScope('');
    setTypeCode(''); setReferenceNor(''); setDateSignature(''); setDatePublication('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !titre.trim() || !stockCode.trim()) {
      setError('PDF, titre officiel et code stock sont requis.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('pdf_file', pdfFile);
      fd.append('titre_officiel', titre.trim());
      fd.append('document_role', 'STOCK');
      fd.append('stock_code', stockCode.trim());
      if (legalScope) fd.append('legal_scope', legalScope);
      if (typeCode.trim()) fd.append('type_code', typeCode.trim());
      if (referenceNor.trim()) fd.append('reference_nor', referenceNor.trim());
      if (dateSignature) fd.append('date_signature', dateSignature);
      if (datePublication) fd.append('date_publication', datePublication);
      if (mdFile) fd.append('md_file', mdFile);
      if (jsonFile) fd.append('json_file', jsonFile);

      const res = await uploadDocument(fd);
      onSuccess(`« ${titre.trim()} » déposé (ID ${res.document_id.slice(0, 8)}…)`);
      reset();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PdfDropzone id="stock-pdf-input" file={pdfFile} onChange={setPdfFile} />

      <Field label="Titre officiel" required>
        <TextInput
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Ex : Code du Travail (Loi n° 45/75 du 15 mars 1975)"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Code stock" required>
          <TextInput
            value={stockCode}
            onChange={(e) => setStockCode(e.target.value)}
            placeholder="code-travail-1975"
            className="font-mono"
          />
        </Field>
        <Field label="Périmètre juridique">
          <Select value={legalScope} onChange={(e) => setLegalScope(e.target.value)}>
            <option value="">Auto-détection</option>
            <option value="national">National</option>
            <option value="ohada">OHADA</option>
            <option value="communautaire">Communautaire</option>
          </Select>
        </Field>
      </div>

      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-t3 mb-1.5">
          Artefacts pré-traités <span className="text-t4 normal-case tracking-normal">(recommandé — évite l'OCR)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ArtifactPicker
            id="stock-md-input"
            label="Joindre le .md"
            accept=".md,text/markdown"
            file={mdFile}
            onChange={setMdFile}
          />
          <ArtifactPicker
            id="stock-json-input"
            label="Joindre le .json"
            accept=".json,application/json"
            file={jsonFile}
            onChange={setJsonFile}
          />
        </div>
        {!mdFile && !jsonFile && (
          <p className="text-t4 text-[11px] font-mono mt-1.5">
            Sans artefact, l'extraction OCR (MinerU) sera lancée automatiquement.
          </p>
        )}
      </div>

      {/* Métadonnées avancées */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1.5 text-t3 hover:text-t2 text-xs font-mono transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          className={`w-3 h-3 stroke-current fill-none stroke-2 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Métadonnées avancées
      </button>
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
          <Field label="Type (code)">
            <TextInput
              value={typeCode}
              onChange={(e) => setTypeCode(e.target.value)}
              placeholder="CODE, LOI, CONST…"
              className="font-mono uppercase"
            />
          </Field>
          <Field label="Référence (NOR)">
            <TextInput
              value={referenceNor}
              onChange={(e) => setReferenceNor(e.target.value)}
              placeholder="45/75"
              className="font-mono"
            />
          </Field>
          <Field label="Date de signature">
            <DateInput value={dateSignature} onChange={(e) => setDateSignature(e.target.value)} />
          </Field>
          <Field label="Date de publication">
            <DateInput value={datePublication} onChange={(e) => setDatePublication(e.target.value)} />
          </Field>
        </div>
      )}

      {error && <ErrorNote message={error} />}

      <button
        type="submit"
        disabled={loading || !pdfFile || !titre.trim() || !stockCode.trim()}
        className="w-full h-9 bg-gold text-[#120e00] font-semibold text-sm rounded-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Spinner /> Dépôt en cours…
          </>
        ) : (
          'Déposer le texte consolidé'
        )}
      </button>
    </form>
  );
}

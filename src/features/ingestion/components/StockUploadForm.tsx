/**
 * StockUploadForm.tsx — Dépôt d'un texte consolidé (STOCK) :
 * code de la famille, code du travail, constitution… Le PDF d'origine est
 * obligatoire ; les artefacts MD/JSON déjà préparés sont fortement recommandés
 * (ils court-circuitent l'OCR MinerU et permettent un parsing immédiat).
 */
import React, { useState } from 'react';
import { uploadDocument } from '../api/pythonApi';
import { useDocumentTypes } from '@/features/library/hooks/useLibrary';
import { PdfDropzone, ArtifactMultiPicker } from './FilePicker';
import { Field, TextInput, DateInput, Select, ErrorNote, HelpTip } from './fields';
import { Spinner } from './badges';

/**
 * Côté base, `legal_documents.stock_code` est un `varchar(100)`. On plafonne donc
 * le code ici : un titre long produit un slug bien plus long que 100 caractères,
 * ce qui faisait planter l'INSERT (StringDataRightTruncation → 500).
 */
const MAX_STOCK_CODE_LEN = 100;

/**
 * Reproduit `sanitize_path_component` du backend Python (main.py) : ce que l'on
 * prévisualise ici est exactement la clé/le dossier MinIO qui sera stocké.
 * On retire les accents en plus (é → e) pour un slug propre ; comme la valeur
 * envoyée est déjà ASCII-kebab, le sanitize serveur la laisse inchangée.
 * Le résultat est tronqué à MAX_STOCK_CODE_LEN (sans laisser de tiret en fin).
 */
function slugifyStockCode(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.slice(0, MAX_STOCK_CODE_LEN).replace(/-+$/g, '');
}

const FRENCH_MONTHS: Record<string, string> = {
  janvier: '01', février: '02', fevrier: '02', mars: '03', avril: '04',
  mai: '05', juin: '06', juillet: '07', août: '08', aout: '08',
  septembre: '09', octobre: '10', novembre: '11', décembre: '12', decembre: '12',
};

/**
 * Suggestions best-effort tirées du titre (NOR + date de signature). Jamais
 * imposées : on ne pré-remplit qu'un champ encore vierge, et tout reste éditable.
 */
function suggestFromTitle(title: string): { nor?: string; dateSignature?: string } {
  const out: { nor?: string; dateSignature?: string } = {};

  // NOR : « n° 45/75 », « n°46 2014 », « no 12-2020 »…
  const norMatch = /n[°ºo]\s*°?\s*(\d{1,4})(?:\s*[/\- ]\s*(\d{2,4}))?/i.exec(title);
  if (norMatch) out.nor = norMatch[2] ? `${norMatch[1]}/${norMatch[2]}` : norMatch[1];

  // Date : « du 3 novembre 2014 » → 2014-11-03
  const dateMatch = /\bdu\s+(\d{1,2})\s+([a-zà-ÿ]+)\s+(\d{4})/i.exec(title);
  if (dateMatch) {
    const mm = FRENCH_MONTHS[dateMatch[2].toLowerCase()];
    if (mm) out.dateSignature = `${dateMatch[3]}-${mm}-${dateMatch[1].padStart(2, '0')}`;
  }

  return out;
}

export function StockUploadForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const { data: docTypes } = useDocumentTypes();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [mdFiles, setMdFiles] = useState<File[]>([]);
  const [jsonFiles, setJsonFiles] = useState<File[]>([]);
  const [titre, setTitre] = useState('');
  const [stockCode, setStockCode] = useState('');
  // Tant que l'utilisateur n'a pas édité le code à la main, on le dérive du titre.
  const [stockCodeTouched, setStockCodeTouched] = useState(false);
  const [legalScope, setLegalScope] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [typeCode, setTypeCode] = useState('');
  const [referenceNor, setReferenceNor] = useState('');
  const [dateSignature, setDateSignature] = useState('');
  const [datePublication, setDatePublication] = useState('');
  // Suggestions NOR/date dérivées du titre : on cesse de les écraser dès édition manuelle.
  const [norTouched, setNorTouched] = useState(false);
  const [dateSignatureTouched, setDateSignatureTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPdfFile(null); setMdFiles([]); setJsonFiles([]);
    setTitre(''); setStockCode(''); setStockCodeTouched(false); setLegalScope('');
    setTypeCode(''); setReferenceNor(''); setDateSignature(''); setDatePublication('');
    setNorTouched(false); setDateSignatureTouched(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !titre.trim() || !stockCode.trim()) {
      setError('PDF, titre officiel et code stock sont requis.');
      return;
    }
    if (stockCode.trim().length > MAX_STOCK_CODE_LEN) {
      setError(`Le code stock ne doit pas dépasser ${MAX_STOCK_CODE_LEN} caractères (raccourcissez-le : il est dérivé du titre).`);
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
      // Plusieurs morceaux (PDF découpé avant MinerU) → le backend les fusionne.
      // On les envoie tous sous le même nom de champ ; nommez-les
      // « chunk_1_a_200.json » pour garantir l'ordre et la pagination globale.
      mdFiles.forEach((f) => fd.append('md_file', f));
      jsonFiles.forEach((f) => fd.append('json_file', f));

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
          onChange={(e) => {
            const v = e.target.value;
            setTitre(v);
            // Tant qu'il n'a pas été édité à la main, le code stock suit le titre.
            if (!stockCodeTouched) setStockCode(slugifyStockCode(v));
            // Suggestions best-effort (NOR, date de signature) tant que vierges.
            const s = suggestFromTitle(v);
            if (!norTouched && s.nor) setReferenceNor(s.nor);
            if (!dateSignatureTouched && s.dateSignature) setDateSignature(s.dateSignature);
          }}
          placeholder="Ex : Code du Travail (Loi n° 45/75 du 15 mars 1975)"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Code stock" required>
          <TextInput
            value={stockCode}
            onChange={(e) => {
              const v = e.target.value;
              setStockCode(v);
              // Édition manuelle → on fige ; champ vidé → l'auto-remplissage reprend.
              setStockCodeTouched(v.trim().length > 0);
            }}
            onBlur={(e) => setStockCode(slugifyStockCode(e.target.value))}
            placeholder="code-travail-1975"
            className="font-mono"
            maxLength={MAX_STOCK_CODE_LEN}
          />
          <p className="text-t4 text-[11px] font-mono mt-1 leading-tight">
            Identifiant unique + dossier de stockage MinIO. Pré-rempli depuis le titre, modifiable
            {' '}(max&nbsp;{MAX_STOCK_CODE_LEN}&nbsp;car.).
          </p>
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
        <div className="text-xs font-mono uppercase tracking-widest text-t3 mb-1.5 flex items-center gap-1.5">
          <span>Artefacts pré-traités <span className="text-t4 normal-case tracking-normal">(recommandé — évite l'OCR)</span></span>
          <HelpTip>
            <div className="space-y-1.5">
              <p>Ces fichiers court-circuitent l'OCR (MinerU) et permettent un parsing immédiat.</p>
              <p>
                <strong className="text-gold">JSON</strong> — à privilégier si le PDF contient des <strong>tableaux</strong> ou
                une mise en page complexe, et pour conserver les <strong>numéros de page</strong> (citabilité). Format le plus fidèle.
              </p>
              <p>
                <strong className="text-purple">Markdown</strong> — pour les textes simples. Plus lisible/éditable à la main,
                mais perd les numéros de page et peut dégrader les tableaux.
              </p>
            </div>
          </HelpTip>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ArtifactMultiPicker
            id="stock-md-input"
            label="Joindre le(s) .md"
            accept=".md,text/markdown"
            files={mdFiles}
            onChange={setMdFiles}
          />
          <ArtifactMultiPicker
            id="stock-json-input"
            label="Joindre le(s) .json"
            accept=".json,application/json"
            files={jsonFiles}
            onChange={setJsonFiles}
          />
        </div>
        {mdFiles.length === 0 && jsonFiles.length === 0 ? (
          <p className="text-t4 text-[11px] font-mono mt-1.5">
            Sans artefact, l'extraction OCR (MinerU) sera lancée automatiquement.
          </p>
        ) : (
          (mdFiles.length > 1 || jsonFiles.length > 1) && (
            <p className="text-t4 text-[11px] font-mono mt-1.5">
              Plusieurs morceaux détectés : ils seront fusionnés côté serveur. Nommez-les
              {' '}<span className="text-t3">chunk_1_a_200.json</span> pour garantir l'ordre et les numéros de page.
            </p>
          )
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
            <Select value={typeCode} onChange={(e) => setTypeCode(e.target.value)} className="font-mono">
              <option value="">Auto-détection</option>
              {(docTypes ?? []).map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code} — {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Référence (NOR)">
            <TextInput
              value={referenceNor}
              onChange={(e) => {
                setReferenceNor(e.target.value);
                setNorTouched(e.target.value.trim().length > 0);
              }}
              placeholder="45/75"
              className="font-mono"
            />
          </Field>
          <Field label="Date de signature">
            <DateInput
              value={dateSignature}
              onChange={(e) => {
                setDateSignature(e.target.value);
                setDateSignatureTouched(!!e.target.value);
              }}
            />
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
        className="w-full h-9 bg-gold text-on-gold font-semibold text-sm rounded-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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

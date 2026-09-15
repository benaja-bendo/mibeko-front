/**
 * DepotForm.tsx — Formulaire de dépôt à trois branches (mibeko-python#23
 * § 3.2, front#43) : Journal officiel / Texte consolidé / Acte isolé. Une
 * seule question à l'éditeur (« qu'est-ce que c'est ? »), le structureur
 * déduit le reste de l'en-tête — remplace StockUploadForm/JournalUploadForm
 * et leurs métadonnées saisies à la main (titre, code, type, institution,
 * NOR, trois dates). N'accepte plus de .md/.json joints à la main : c'était
 * le contournement d'un OCR mort (docs/pipeline/plan-boite-de-reception).
 */
import { useState } from 'react';
import { createDepot, asDepotConflict, type DepotConflict, type DepotTypeSource } from '../api/pythonApi';
import { PdfDropzone } from './FilePicker';
import { Field, TextInput, DateInput, ErrorNote, HelpTip } from './fields';
import { Spinner } from './badges';

const BRANCHES: { value: DepotTypeSource; label: string; hint: string }[] = [
  { value: 'journal_officiel', label: 'Journal officiel', hint: 'Sera découpé en actes distincts' },
  { value: 'code', label: 'Texte consolidé', hint: 'Code, constitution…' },
  { value: 'acte_uniforme', label: 'Acte uniforme OHADA', hint: 'Texte consolidé communautaire' },
  { value: 'acte', label: 'Acte isolé', hint: 'Loi, décret, arrêté, ordonnance…' },
];

const ACTION_LABELS: Record<string, string> = {
  ouvrir_le_dossier: 'Ouvrir le dossier',
  reprendre_le_traitement: 'Reprendre son traitement',
  nouvelle_extraction: 'Demander une nouvelle extraction',
};

function ConflictCard({ conflict, onOpenDocument }: { conflict: DepotConflict; onOpenDocument: (id: string) => void }) {
  return (
    <div className="border border-amber/25 bg-amber/8 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber text-sm font-body font-semibold">
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 stroke-current fill-none stroke-2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {conflict.message}
      </div>
      <div className="flex flex-wrap gap-2">
        {conflict.actions.map((action) => {
          const canOpen = action === 'ouvrir_le_dossier' && conflict.document_id;
          return (
            <button
              key={action}
              type="button"
              disabled={!canOpen}
              onClick={() => canOpen && onOpenDocument(conflict.document_id as string)}
              title={canOpen ? undefined : 'Pas encore disponible depuis cet écran'}
              className={[
                'h-8 px-3 rounded-md text-xs font-mono border transition-colors',
                canOpen
                  ? 'text-amber border-amber/30 bg-amber/10 hover:bg-amber/20 cursor-pointer'
                  : 'text-t4 border-b1 bg-s2 cursor-not-allowed',
              ].join(' ')}
            >
              {ACTION_LABELS[action] ?? action}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DepotForm({
  onDeposited,
  onOpenDocument,
}: {
  /** Appelé après un dépôt réussi (201) — le parent bascule vers « En cours ». */
  onDeposited: (msg: string) => void;
  onOpenDocument: (documentId: string) => void;
}) {
  const [typeSource, setTypeSource] = useState<DepotTypeSource>('acte');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [titre, setTitre] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [joNumero, setJoNumero] = useState('');
  const [joDate, setJoDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<DepotConflict | null>(null);

  const isJournal = typeSource === 'journal_officiel';
  const missingJoFields = isJournal && (!joNumero.trim() || !joDate);
  const canSubmit = !!pdfFile && !missingJoFields && !loading;

  const reset = () => {
    setPdfFile(null); setTitre(''); setSourceUrl(''); setJoNumero(''); setJoDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) { setError('Le PDF source est obligatoire.'); return; }
    if (missingJoFields) { setError('Numéro et date du Journal officiel sont obligatoires.'); return; }
    setError(null);
    setConflict(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('pdf_file', pdfFile);
      fd.append('type_source', typeSource);
      if (titre.trim()) fd.append('titre', titre.trim());
      if (sourceUrl.trim()) fd.append('source_url', sourceUrl.trim());
      if (isJournal) {
        fd.append('jo_numero', joNumero.trim());
        fd.append('jo_date', joDate);
      }

      const res = await createDepot(fd);
      onDeposited(res.message);
      reset();
    } catch (err: unknown) {
      const asConflict = asDepotConflict(err);
      if (asConflict) {
        setConflict(asConflict);
      } else {
        setError(err instanceof Error ? err.message : 'Erreur lors du dépôt');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <Field label="Qu'est-ce que c'est ?" required>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BRANCHES.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => setTypeSource(b.value)}
              className={[
                'text-left rounded-lg border px-3 py-2.5 transition-colors',
                typeSource === b.value
                  ? 'border-gold/50 bg-gold/8 text-t1'
                  : 'border-b1 bg-s2 text-t3 hover:border-b3 hover:text-t2',
              ].join(' ')}
            >
              <div className="text-sm font-body font-semibold">{b.label}</div>
              <div className="text-[11px] font-mono text-t4 mt-0.5">{b.hint}</div>
            </button>
          ))}
        </div>
      </Field>

      <PdfDropzone id="depot-pdf-input" file={pdfFile} onChange={setPdfFile} />

      {isJournal && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Numéro du JO" required>
            <TextInput value={joNumero} onChange={(e) => setJoNumero(e.target.value)} placeholder="13-2026" className="font-mono" />
          </Field>
          <Field label="Date de publication" required>
            <DateInput value={joDate} onChange={(e) => setJoDate(e.target.value)} />
          </Field>
        </div>
      )}

      <Field label="Titre imposé">
        <TextInput
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Laissez vide pour le déduire de l'en-tête"
        />
      </Field>

      <div>
        <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-t3 mb-1.5">
          <span>URL officielle</span>
          <HelpTip>Provenance du texte (sgg.cg, site institutionnel…). Sans elle, un signalement non bloquant est posé pour reprise ultérieure.</HelpTip>
        </div>
        <TextInput
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://sgg.cg/…"
          className="font-mono"
        />
      </div>

      {error && <ErrorNote message={error} />}
      {conflict && <ConflictCard conflict={conflict} onOpenDocument={onOpenDocument} />}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full h-9 bg-gold text-on-gold font-semibold text-sm rounded-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (<><Spinner /> Dépôt en cours…</>) : 'Déposer'}
      </button>
    </form>
  );
}

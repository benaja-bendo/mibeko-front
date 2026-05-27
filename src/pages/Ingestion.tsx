/**
 * Ingestion.tsx — Page de gestion de l'ingestion de documents PDF.
 * Pilote le backend Python : upload, parse, suivi SSE en temps réel.
 */
import React, { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPythonDocuments,
  uploadDocument,
  parseDocument,
  deletePythonDocument,
  type PythonDocumentSummary,
} from '../services/pythonApi';
import { usePythonStream } from '../hooks/usePythonStream';
import AppLayout from '../components/layout/AppLayout';

// ---------------------------------------------------------------------------
// Types locaux
// ---------------------------------------------------------------------------
interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' }

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
const STATUS_CFG: Record<string, string> = {
  completed:  'text-green  bg-green/10  border-green/20',
  processing: 'text-amber  bg-amber/10  border-amber/20',
  pending:    'text-t2     bg-s2        border-b1',
  failed:     'text-red    bg-red/10    border-red/20',
  partial:    'text-blue   bg-blue/10   border-blue/20',
  running:    'text-amber  bg-amber/10  border-amber/20',
  queued:     'text-purple bg-purple/10 border-purple/20',
};

function StatusBadge({ status }: { status?: string | null }) {
  const cls = STATUS_CFG[status || ''] || 'text-t3 bg-s2 border-b1';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border ${cls}`}>
      {status || '—'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Upload Form
// ---------------------------------------------------------------------------
function UploadForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [mdFile, setMdFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [titre, setTitre] = useState('');
  const [role, setRole] = useState<'STOCK' | 'FLUX'>('STOCK');
  const [stockCode, setStockCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type === 'application/pdf');
    if (file) setPdfFile(file);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !titre.trim()) {
      setError('Un fichier PDF et un titre sont requis.');
      return;
    }
    if (role === 'STOCK' && !stockCode.trim()) {
      setError('Le code stock est requis pour un document STOCK.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('pdf_file', pdfFile);
      fd.append('titre_officiel', titre.trim());
      fd.append('document_role', role);
      if (role === 'STOCK' && stockCode.trim()) fd.append('stock_code', stockCode.trim());
      if (mdFile) fd.append('md_file', mdFile);
      if (jsonFile) fd.append('json_file', jsonFile);

      const res = await uploadDocument(fd);
      onSuccess(`Document "${titre}" uploadé avec succès (ID: ${res.document_id.slice(0, 8)}…)`);
      setPdfFile(null); setMdFile(null); setJsonFile(null);
      setTitre(''); setStockCode('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          'relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer',
          isDragging ? 'border-gold/50 bg-gold/5' : 'border-b2 hover:border-b3 hover:bg-s2',
        ].join(' ')}
        onClick={() => document.getElementById('pdf-input')?.click()}
      >
        <input
          id="pdf-input"
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
        />
        {pdfFile ? (
          <div className="flex items-center justify-center gap-2 text-green text-sm font-mono">
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.5]">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(1)} Mo)
          </div>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-t3 fill-none stroke-[1.5] mx-auto mb-2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-t2 text-sm font-body">Glissez un PDF ici ou <span className="text-gold">cliquez pour parcourir</span></p>
            <p className="text-t3 text-xs font-mono mt-1">Formats acceptés : PDF</p>
          </>
        )}
      </div>

      {/* Titre */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-t3 mb-1.5">
          Titre officiel *
        </label>
        <input
          type="text"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Ex: Code du Travail, Loi n°2024-001..."
          className="w-full h-9 bg-s2 border border-b1 rounded-md text-t1 px-3 text-sm font-body outline-none transition-colors focus:border-gold/40 placeholder:text-t4"
        />
      </div>

      {/* Rôle + Stock Code */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-t3 mb-1.5">Rôle</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'STOCK' | 'FLUX')}
            className="w-full h-9 bg-s2 border border-b1 rounded-md text-t1 px-3 text-sm font-body outline-none focus:border-gold/40"
          >
            <option value="STOCK">STOCK (code consolidé)</option>
            <option value="FLUX">FLUX (texte modificateur)</option>
          </select>
        </div>
        {role === 'STOCK' && (
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-t3 mb-1.5">Code stock *</label>
            <input
              type="text"
              value={stockCode}
              onChange={(e) => setStockCode(e.target.value)}
              placeholder="Ex: code-travail-1975"
              className="w-full h-9 bg-s2 border border-b1 rounded-md text-t1 px-3 text-sm font-mono outline-none transition-colors focus:border-gold/40 placeholder:text-t4"
            />
          </div>
        )}
      </div>

      {/* Artefacts optionnels */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-t3 mb-1.5">
            Markdown (optionnel)
          </label>
          <input
            type="file"
            accept=".md,text/markdown"
            onChange={(e) => setMdFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-t2 font-mono file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-s3 file:text-t2 file:text-xs file:cursor-pointer cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-t3 mb-1.5">
            JSON (optionnel)
          </label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => setJsonFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-t2 font-mono file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-s3 file:text-t2 file:text-xs file:cursor-pointer cursor-pointer"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red text-xs font-mono bg-red/8 border border-red/20 rounded-md px-3 py-2">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 stroke-current fill-none stroke-2">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !pdfFile || !titre.trim()}
        className="w-full h-9 bg-gold text-[#120e00] font-semibold text-sm rounded-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin stroke-current fill-none stroke-2">
              <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
              <path d="M12 3a9 9 0 0 1 9 9" />
            </svg>
            Upload en cours…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Uploader et ingérer
          </>
        )}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Document row
// ---------------------------------------------------------------------------
function DocRow({
  doc,
  onParse,
  onDelete,
}: {
  doc: PythonDocumentSummary;
  onParse: (id: string, fmt: 'md' | 'json') => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-s2 transition-colors group">
      {/* Status dot */}
      <div className={[
        'w-1.5 h-1.5 rounded-full shrink-0',
        doc.extraction_status === 'completed' ? 'bg-green' :
        doc.extraction_status === 'processing' || doc.latest_run_status === 'running' ? 'bg-amber animate-pulse' :
        doc.extraction_status === 'failed' ? 'bg-red' : 'bg-t4'
      ].join(' ')} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-t1 text-xs font-body truncate">{doc.titre_officiel}</div>
        <div className="text-t3 text-[11px] font-mono mt-0.5 flex items-center gap-2 flex-wrap">
          {doc.stock_code && <span>{doc.stock_code}</span>}
          {doc.document_role && <span className="text-t4">·</span>}
          {doc.document_role && <span>{doc.document_role}</span>}
          {doc.has_md && <span className="text-green">MD ✓</span>}
          {doc.has_json && <span className="text-blue">JSON ✓</span>}
          {doc.created_at && (
            <span className="text-t4">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
          )}
        </div>
      </div>

      {/* Status */}
      <StatusBadge status={doc.extraction_status} />

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {doc.has_md && (
          <button
            onClick={() => onParse(doc.id, 'md')}
            className="h-6 px-2 text-[11px] font-mono text-green bg-green/10 border border-green/20 rounded hover:bg-green/20 transition-colors"
            title="Parser depuis MD"
          >
            Parse MD
          </button>
        )}
        {doc.has_json && (
          <button
            onClick={() => onParse(doc.id, 'json')}
            className="h-6 px-2 text-[11px] font-mono text-blue bg-blue/10 border border-blue/20 rounded hover:bg-blue/20 transition-colors"
            title="Parser depuis JSON"
          >
            Parse JSON
          </button>
        )}
        {confirmDel ? (
          <>
            <button
              onClick={() => onDelete(doc.id)}
              className="h-6 px-2 text-[11px] font-mono text-red bg-red/10 border border-red/20 rounded hover:bg-red/20"
            >
              Confirmer
            </button>
            <button
              onClick={() => setConfirmDel(false)}
              className="h-6 px-2 text-[11px] font-mono text-t2 bg-s3 border border-b1 rounded hover:bg-s4"
            >
              Annuler
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            className="h-6 w-6 flex items-center justify-center text-t3 hover:text-red transition-colors rounded hover:bg-red/10"
            title="Supprimer"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.5]">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ingestion page
// ---------------------------------------------------------------------------
export default function Ingestion() {
  const queryClient = useQueryClient();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const addToast = (message: string, type: Toast['type']) => {
    const id = ++toastId.current;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 6000);
  };

  // SSE
  usePythonStream({
    onNotification: ({ message, type }) => addToast(message, type),
  });

  const { data: docs, isLoading } = useQuery({
    queryKey: ['python-documents'],
    queryFn: () => getPythonDocuments({ limit: 50 }),
    refetchInterval: 8000,
  });

  const handleParse = async (id: string, fmt: 'md' | 'json') => {
    try {
      await parseDocument(id, fmt);
      addToast(`Parsing ${fmt.toUpperCase()} lancé en arrière-plan`, 'info');
      queryClient.invalidateQueries({ queryKey: ['python-documents'] });
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Erreur de parsing', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePythonDocument(id);
      addToast('Document supprimé', 'success');
      queryClient.invalidateQueries({ queryKey: ['python-documents'] });
      queryClient.invalidateQueries({ queryKey: ['python-stats'] });
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Erreur de suppression', 'error');
    }
  };

  const statusGroups = {
    running:   (docs || []).filter((d) => d.latest_run_status === 'running' || d.extraction_status === 'processing'),
    completed: (docs || []).filter((d) => d.extraction_status === 'completed'),
    pending:   (docs || []).filter((d) => d.extraction_status === 'pending'),
    failed:    (docs || []).filter((d) => d.extraction_status === 'failed'),
  };

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-xl font-display font-semibold text-t1">Ingestion de documents</h1>
            <p className="text-t3 text-xs font-mono mt-0.5">
              Déposez des PDFs pour extraction — piloté par le backend Python (MinerU + spaCy)
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Upload form */}
            <div className="lg:col-span-2">
              <div className="bg-s1 border border-b1 rounded-xl p-4 space-y-4 sticky top-6">
                <div className="text-t1 text-sm font-semibold font-body">Nouveau document</div>
                <UploadForm
                  onSuccess={(msg) => {
                    addToast(msg, 'success');
                    queryClient.invalidateQueries({ queryKey: ['python-documents'] });
                    queryClient.invalidateQueries({ queryKey: ['python-stats'] });
                  }}
                />
              </div>
            </div>

            {/* Document list */}
            <div className="lg:col-span-3 space-y-4">
              {/* En cours */}
              {statusGroups.running.length > 0 && (
                <div className="bg-amber/5 border border-amber/15 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber/15">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-amber fill-none stroke-2 animate-spin">
                      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
                      <path d="M12 3a9 9 0 0 1 9 9" />
                    </svg>
                    <span className="text-amber text-xs font-mono font-semibold uppercase tracking-widest">
                      En cours ({statusGroups.running.length})
                    </span>
                  </div>
                  <div className="divide-y divide-amber/10">
                    {statusGroups.running.map((d) => (
                      <DocRow key={d.id} doc={d} onParse={handleParse} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              )}

              {/* Tous les documents */}
              <div className="bg-s1 border border-b1 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-b1">
                  <span className="text-t1 text-sm font-semibold font-body">
                    Tous les documents {docs ? `(${docs.length})` : ''}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-t3">
                    <span className="text-green">{statusGroups.completed.length} ✓</span>
                    <span className="text-amber">{statusGroups.pending.length} en attente</span>
                    {statusGroups.failed.length > 0 && (
                      <span className="text-red">{statusGroups.failed.length} échoués</span>
                    )}
                  </div>
                </div>
                {isLoading ? (
                  <div className="px-4 py-8 text-center text-t3 text-xs font-mono flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin stroke-current fill-none stroke-2">
                      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
                      <path d="M12 3a9 9 0 0 1 9 9" />
                    </svg>
                    Chargement…
                  </div>
                ) : !docs || docs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-t3 text-xs font-mono">
                    Aucun document. Uploadez votre premier PDF →
                  </div>
                ) : (
                  <div className="divide-y divide-b1 max-h-[calc(100vh-280px)] overflow-y-auto">
                    {docs.map((d) => (
                      <DocRow key={d.id} doc={d} onParse={handleParse} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              'flex items-start gap-2.5 p-3 rounded-lg border text-xs font-body shadow-xl animate-in slide-in-from-right-4',
              t.type === 'success' ? 'bg-green/10 border-green/20 text-green' :
              t.type === 'error'   ? 'bg-red/10 border-red/20 text-red' :
                                      'bg-blue/10 border-blue/20 text-blue',
            ].join(' ')}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              className="opacity-50 hover:opacity-100 shrink-0 font-mono"
            >✕</button>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}

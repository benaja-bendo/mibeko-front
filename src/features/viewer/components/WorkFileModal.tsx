import { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, CheckCircle2, Download, FileUp, Loader2, Trash2, Upload,
} from 'lucide-react';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import {
  apiErrorMessage,
  getWorkFileSnapshot,
  submitWorkFile,
  type WorkFileResult,
  type WorkFileSnapshot,
  type WorkFileTarget,
} from '@/features/documents/api/laravelApi';
import {
  buildWorkFileDiff, extractTarget, validateWorkFile, type ArticleDiff, type WorkFileDiff,
} from '@/features/viewer/lib/workFileDiff';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/shared/lib/utils';
import type { LegalDocument } from '@/shared/types/database';

const MOTIF_MIN = 20;

/**
 * Dossier de travail : sortir l'état structuré du document, le faire corriger
 * par n'importe quelle IA contre le PDF officiel, puis réappliquer la
 * proposition sous arbitrage humain.
 *
 * Le fichier n'écrit jamais en base de lui-même. Le dépôt ne déclenche qu'une
 * SIMULATION ; l'application est un second geste, explicite. Et une disparition
 * d'articles ne s'applique pas tant que l'éditeur n'a pas recopié leur nombre :
 * une réponse d'IA tronquée ressemble en tout point à une suppression voulue.
 */
export default function WorkFileModal({ document: doc }: { document?: LegalDocument }) {
  const { id: documentId } = useParams<{ id: string }>();
  const { workFileModalOpen, setWorkFileModalOpen } = useViewerStore();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState<'export' | 'dry-run' | 'apply' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{
    target: WorkFileTarget;
    fingerprint: string;
    snapshot: WorkFileSnapshot;
  } | null>(null);
  const [preview, setPreview] = useState<WorkFileResult | null>(null);
  const [applied, setApplied] = useState<WorkFileResult | null>(null);
  const [motif, setMotif] = useState('');
  const [confirmedDeletions, setConfirmedDeletions] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const diff: WorkFileDiff | null = useMemo(
    () => (proposal ? buildWorkFileDiff(proposal.snapshot.target, proposal.target) : null),
    [proposal],
  );

  const reset = () => {
    setBusy(null); setError(null); setFilename(null); setProposal(null);
    setPreview(null); setApplied(null); setMotif(''); setConfirmedDeletions(''); setExpanded(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const close = (open: boolean) => {
    setWorkFileModalOpen(open);
    if (!open) reset();
  };

  const handleExport = async () => {
    if (!documentId) return;
    setBusy('export'); setError(null);
    try {
      const snapshot = await getWorkFileSnapshot(documentId);
      const safeTitle = (doc?.titre_officiel || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const link = window.document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${safeTitle}_dossier-de-travail.json`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (e) {
      setError(apiErrorMessage(e, 'Impossible de produire le dossier de travail.'));
    } finally {
      setBusy(null);
    }
  };

  const handleFile = async (file: File) => {
    if (!documentId) return;
    setBusy('dry-run'); setError(null); setPreview(null); setProposal(null); setApplied(null);
    setConfirmedDeletions('');

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const snapshot = await getWorkFileSnapshot(documentId);

      const invalide = validateWorkFile(snapshot, parsed);
      if (invalide) { setError(invalide); return; }

      const target = extractTarget(parsed);
      // L'empreinte du fichier fait foi quand il en porte une : c'est elle qui
      // détecte qu'un tiers a modifié le document depuis l'export.
      const fingerprint =
        (parsed as Partial<WorkFileSnapshot>).expected_fingerprint ?? snapshot.expected_fingerprint;

      const result = await submitWorkFile(documentId, {
        execute: false, expected_fingerprint: fingerprint, target,
        motif: 'Simulation d’un dossier de travail déposé pour arbitrage.',
      });

      setProposal({ target, fingerprint, snapshot });
      setPreview(result);
      setFilename(file.name);
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? 'Ce fichier n’est pas du JSON valide.'
          : apiErrorMessage(e, 'La simulation a échoué.'),
      );
    } finally {
      setBusy(null);
    }
  };

  const removals = preview?.plan.articles_soft_deleted ?? 0;
  const deletionsConfirmed = removals === 0 || Number(confirmedDeletions) === removals;
  const motifTropCourt = motif.trim().length < MOTIF_MIN;
  const applicable = Boolean(proposal && preview && !preview.already_applied)
    && deletionsConfirmed && !motifTropCourt;

  const handleApply = async () => {
    if (!documentId || !proposal || !applicable) return;
    setBusy('apply'); setError(null);
    try {
      const result = await submitWorkFile(documentId, {
        execute: true,
        expected_fingerprint: proposal.fingerprint,
        target: proposal.target,
        motif: motif.trim(),
        ...(removals > 0 ? { confirmDeletions: removals } : {}),
      });
      setApplied(result);
      await queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      await queryClient.invalidateQueries({ queryKey: ['curation-flags', documentId] });
    } catch (e) {
      setError(apiErrorMessage(e, 'L’application a échoué. Rien n’a été écrit.'));
    } finally {
      setBusy(null);
    }
  };

  const changed = diff?.articles.filter((a) => a.status !== 'inchange') ?? [];

  return (
    <Dialog open={workFileModalOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-gold" />
            Dossier de travail
          </DialogTitle>
          <DialogDescription>
            Exportez l’état structuré du document, faites-le corriger contre le PDF officiel,
            puis déposez la proposition ici. Rien ne s’écrit avant votre application explicite.
          </DialogDescription>
        </DialogHeader>

        {applied ? (
          <AppliedSummary result={applied} onRestart={reset} />
        ) : (
          <div className="space-y-4">
            {/* Étape 1 — sortir le dossier */}
            <section className="bg-s2 border border-b1 rounded p-3 space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-t3">1 · Exporter</p>
              <p className="text-t2 text-[11px] leading-relaxed">
                Le fichier porte la structure, le texte, les repères de page et l’empreinte du PDF
                source. Confiez-le à l’IA de votre choix <strong>avec le PDF officiel</strong> —
                c’est lui qui fait foi, jamais la réponse du modèle.
              </p>
              <Button variant="outline" onClick={handleExport} disabled={busy !== null} className="gap-2">
                {busy === 'export' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Télécharger le dossier de travail
              </Button>
            </section>

            {/* Étape 2 — déposer la proposition */}
            <section className="bg-s2 border border-b1 rounded p-3 space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-t3">2 · Déposer la proposition</p>
              <input
                ref={fileInput}
                type="file"
                aria-label="Déposer la proposition corrigée"
                accept="application/json,.json"
                className="block w-full text-[11px] text-t2 file:mr-3 file:rounded file:border file:border-b1 file:bg-s1 file:px-3 file:py-1.5 file:text-t1 file:text-[11px] hover:file:bg-s3"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
                disabled={busy !== null}
              />
              {filename && !error && (
                <p className="text-t3 text-[10px] font-mono">{filename}</p>
              )}
              {busy === 'dry-run' && (
                <p className="text-t3 text-[11px] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Simulation en cours, aucune écriture…
                </p>
              )}
            </section>

            {error && (
              <p className="text-red text-[11px] font-mono bg-red-d border border-red/20 rounded px-3 py-2">
                {error}
              </p>
            )}

            {preview?.already_applied && (
              <p className="text-t2 text-[11px] bg-s2 border border-b1 rounded px-3 py-2">
                Cette proposition correspond déjà exactement à l’état du document. Rien à appliquer.
              </p>
            )}

            {preview && diff && !preview.already_applied && (
              <>
                <PlanSummary diff={diff} removals={removals} />
                <WarningList result={preview} />
                <ChangeList changes={changed} expanded={expanded} onToggle={setExpanded} />

                {removals > 0 && (
                  <label className="block bg-red-d border border-red/30 rounded px-3 py-2.5 space-y-2">
                    <span className="flex items-center gap-2 text-red text-[11px] font-bold">
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      {removals} article{removals > 1 ? 's' : ''} disparaîtrai{removals > 1 ? 'ent' : 't'} du document
                    </span>
                    <span className="block text-t2 text-[11px] leading-relaxed">
                      Une réponse d’IA tronquée produit exactement la même chose qu’une suppression
                      voulue. Recopiez le nombre ci-dessus pour confirmer que vous l’avez lu.
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={confirmedDeletions}
                      onChange={(e) => setConfirmedDeletions(e.target.value.trim())}
                      aria-label="Nombre d’articles retirés à confirmer"
                      placeholder={`Saisir ${removals}`}
                      className="w-32 bg-s1 border border-b1 rounded px-2 py-1 text-[11px] font-mono text-t1"
                    />
                  </label>
                )}

                <label className="block space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-t3">
                    3 · Motif de la correction ({MOTIF_MIN} caractères minimum)
                  </span>
                  <textarea
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    aria-label="Motif de la correction"
                    rows={2}
                    placeholder="Ex. : structure reconstruite contre le PDF source, pages 12 à 18."
                    className="w-full bg-s1 border border-b1 rounded px-2.5 py-2 text-[11px] text-t1 leading-relaxed"
                  />
                </label>
              </>
            )}
          </div>
        )}

        {!applied && (
          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => close(false)}>Fermer</Button>
            <Button
              variant="gold"
              className="gap-2"
              disabled={!applicable || busy !== null}
              title={
                !preview ? 'Déposez d’abord une proposition.'
                  : !deletionsConfirmed ? 'Confirmez le nombre d’articles retirés.'
                  : motifTropCourt ? `Le motif doit faire au moins ${MOTIF_MIN} caractères.`
                  : undefined
              }
              onClick={handleApply}
            >
              {busy === 'apply' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Appliquer la proposition
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlanSummary({ diff, removals }: { diff: WorkFileDiff; removals: number }) {
  const lignes: [string, number, boolean][] = [
    ['Articles retirés', removals, removals > 0],
    ['Articles ajoutés', diff.addedArticles, false],
    ['Articles renumérotés', diff.renumberedArticles, false],
    ['Textes modifiés', diff.contentChanges, false],
    ['Repères de page modifiés', diff.locatorChanges, false],
    ['Divisions retirées', diff.nodes.filter((n) => n.status === 'retire').length, false],
  ];

  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {lignes.map(([label, valeur, alerte]) => (
        <div
          key={label}
          className={cn(
            'border rounded px-2.5 py-2',
            alerte ? 'bg-red-d border-red/30' : 'bg-s2 border-b1',
          )}
        >
          <p className={cn('text-lg font-mono font-bold', alerte ? 'text-red' : 'text-t1')}>{valeur}</p>
          <p className="text-t3 text-[10px] leading-tight">{label}</p>
        </div>
      ))}
      <div className="col-span-2 sm:col-span-3 bg-s2 border border-b1 rounded px-2.5 py-2">
        <p className="text-t2 text-[11px] font-mono">
          {diff.charactersBefore.toLocaleString('fr-FR')} → {diff.charactersAfter.toLocaleString('fr-FR')} caractères
        </p>
      </div>
    </section>
  );
}

function WarningList({ result }: { result: WorkFileResult }) {
  if (result.warnings.length === 0) return null;

  return (
    <section className="bg-amber-d border border-amber/30 rounded px-3 py-2.5 space-y-1.5">
      <p className="flex items-center gap-2 text-amber text-[11px] font-bold">
        <AlertTriangle className="w-3.5 h-3.5" /> {result.warnings.length} signalement(s)
      </p>
      <ul className="space-y-0.5">
        {result.warnings.map((w) => (
          <li key={`${w.kind}-${w.number}`} className="text-t2 text-[11px] font-mono">
            Art. {w.number} — {w.kind === 'contenu_vide' ? 'contenu vidé' : 'contenu raccourci'} :{' '}
            {w.characters_before} → {w.characters_after} caractères
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChangeList({
  changes, expanded, onToggle,
}: { changes: ArticleDiff[]; expanded: string | null; onToggle: (n: string | null) => void }) {
  if (changes.length === 0) {
    return <p className="text-t3 text-[11px]">Aucun article ne change.</p>;
  }

  return (
    <section className="border border-b1 rounded divide-y divide-b1 max-h-64 overflow-y-auto">
      {changes.map((a) => (
        <div key={`${a.status}-${a.number}`}>
          <button
            type="button"
            onClick={() => onToggle(expanded === a.number ? null : a.number)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-s2"
          >
            <span
              className={cn(
                'text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0',
                a.status === 'retire' && 'bg-red-d text-red',
                a.status === 'ajoute' && 'bg-green-d text-green',
                a.status === 'modifie' && 'bg-s3 text-t2',
              )}
            >
              {a.status}
            </span>
            <span className="text-t1 text-[11px] font-mono">
              Art. {a.previousNumber ? `${a.previousNumber} → ${a.number}` : a.number}
            </span>
            <span className="text-t3 text-[10px] ml-auto shrink-0">
              {a.charactersBefore} → {a.charactersAfter} car.
              {a.pageBefore !== a.pageAfter && ` · p. ${a.pageBefore ?? '—'} → ${a.pageAfter ?? '—'}`}
            </span>
          </button>
          {expanded === a.number && (
            <div className="grid sm:grid-cols-2 gap-2 px-2.5 pb-2.5">
              <TextPane label="Avant" text={a.contentBefore} />
              <TextPane label="Après" text={a.contentAfter} />
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function TextPane({ label, text }: { label: string; text: string | null }) {
  return (
    <div className="bg-s1 border border-b1 rounded p-2">
      <p className="text-[9px] font-mono uppercase tracking-wider text-t3 mb-1">{label}</p>
      <p className="text-t2 text-[11px] leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
        {text ?? <span className="text-t3 italic">absent</span>}
      </p>
    </div>
  );
}

function AppliedSummary({ result, onRestart }: { result: WorkFileResult; onRestart: () => void }) {
  const actual = result.actual ?? {};

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-green text-[12px] font-bold">
        <CheckCircle2 className="w-4 h-4" /> Proposition appliquée
      </p>
      <ul className="bg-s2 border border-b1 rounded divide-y divide-b1">
        {Object.entries(actual).map(([cle, valeur]) => (
          <li key={cle} className="flex justify-between px-2.5 py-1.5 text-[11px] font-mono">
            <span className="text-t3">{cle.replace(/_/g, ' ')}</span>
            <span className="text-t1">{valeur}</span>
          </li>
        ))}
      </ul>
      <p className="text-t2 text-[11px] leading-relaxed">
        La publication reste une étape distincte : ce document n’a pas été publié par cette
        opération. Relancez la détection d’anomalies avant de le proposer à la publication.
      </p>
      <Button variant="outline" onClick={onRestart} className="gap-2">
        <ArrowRight className="w-3.5 h-3.5" /> Déposer une autre proposition
      </Button>
    </div>
  );
}

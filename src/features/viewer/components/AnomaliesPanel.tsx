import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import {
  getDocumentCurationFlags,
  resolveCurationFlag,
  detectDocumentAnomalies,
  analyzeDocumentWithAI,
  type CurationFlagDto,
} from '@/features/documents/api/laravelApi';
import { toast } from '@/shared/store/useToast';
import type { TreeNode } from '@/shared/types/database';
import { AlertTriangle, Check, RefreshCw, RotateCcw, Crosshair, Sparkles, X, ShieldCheck } from 'lucide-react';

const SEVERITY: Record<string, { label: string; cls: string; dot: string }> = {
  blocking: { label: 'Bloquant', cls: 'text-red bg-red/10 border-red/20', dot: 'bg-red' },
  warning: { label: 'À vérifier', cls: 'text-amber bg-amber/10 border-amber/20', dot: 'bg-amber' },
  info: { label: 'Info', cls: 'text-blue bg-blue/10 border-blue/20', dot: 'bg-blue' },
};

const SOURCE_LABEL: Record<string, string> = {
  llm: 'IA', structural: 'auto', heuristic: 'auto', human: 'humain', report: 'signalement',
};

/** Chemin racine→cible (inclus) d'un nœud par id dans l'arbre, ou null. */
function findPath(nodes: TreeNode[], id: string, trail: TreeNode[] = []): TreeNode[] | null {
  for (const node of nodes) {
    const here = [...trail, node];
    if (node.id === id) return here;
    if (node.children) {
      const found = findPath(node.children, id, here);
      if (found) return found;
    }
  }
  return null;
}

export default function AnomaliesPanel({ treeData }: { treeData: TreeNode[] }) {
  const { id: documentId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { anomaliesPanelOpen, setAnomaliesPanel, selectNode, openSidePanel, setPdfPage, expandNodes, revealNode, setSearchQuery } = useViewerStore();

  const { data, isLoading } = useQuery({
    queryKey: ['curation-flags', documentId],
    queryFn: () => getDocumentCurationFlags(documentId!).then((r) => r.data),
    enabled: !!documentId && anomaliesPanelOpen,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['curation-flags', documentId] });
    // L'arbre dérive l'état ✗ des anomalies : on le rafraîchit aussi.
    queryClient.invalidateQueries({ queryKey: ['document', documentId] });
  };

  const resolveMutation = useMutation({
    mutationFn: ({ flagId, resolved }: { flagId: string; resolved: boolean }) => resolveCurationFlag(flagId, resolved),
    onSuccess: invalidate,
    onError: (err) => toast.fromError(err, 'Échec de la mise à jour'),
  });

  const detectMutation = useMutation({
    mutationFn: () => detectDocumentAnomalies(documentId!),
    onSuccess: (res) => {
      invalidate();
      toast.success(`Analyse structurelle : ${res.data.created} anomalie(s) signalée(s)`);
    },
    onError: (err) => toast.fromError(err, "Échec de l'analyse structurelle"),
  });

  const aiMutation = useMutation({
    mutationFn: () => analyzeDocumentWithAI(documentId!),
    onSuccess: (res) => {
      invalidate();
      toast.success(`Analyse IA : ${res.data.found} anomalie(s) de contenu détectée(s)`);
    },
    onError: (err) => toast.fromError(err, "Échec de l'analyse IA"),
  });

  if (!anomaliesPanelOpen) return null;

  const flags = data ?? [];
  const open = flags.filter((f) => !f.resolved);
  const counts = {
    blocking: open.filter((f) => f.severity === 'blocking').length,
    warning: open.filter((f) => f.severity === 'warning').length,
    info: open.filter((f) => f.severity === 'info').length,
  };
  const analyzing = detectMutation.isPending || aiMutation.isPending;

  /**
   * Localise la cible d'une anomalie : déplie ses ancêtres, fait défiler l'arbre
   * jusqu'à la ligne et la met en évidence, sélectionne le nœud (→ saut PDF) et
   * ouvre le panneau article. Une recherche active est effacée, sinon elle
   * filtrerait la cible hors de l'arbre.
   */
  const goToTarget = (flag: CurationFlagDto) => {
    const targetId = (flag.article_id || flag.node_id)?.toLowerCase();
    if (targetId) {
      const path = findPath(treeData, targetId);
      if (path) {
        const node = path[path.length - 1];
        const ancestorIds = path.slice(0, -1).map((n) => n.id);
        setSearchQuery('');
        expandNodes(ancestorIds);
        selectNode(node.id, node);
        if (node.type === 'ARTICLE') openSidePanel(node);
        revealNode(node.id);
      }
    }
    if (flag.page) setPdfPage(flag.page);
  };

  return (
    <div className="shrink-0 h-[42vh] max-h-[420px] min-h-[180px] border-t border-b1 bg-s1 flex flex-col">
      {/* En-tête */}
      <div className="px-4 py-2.5 border-b border-b1 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber" />
          <span className="text-[13px] font-semibold text-t1">Anomalies de curation</span>
        </div>

        {/* Compteurs par sévérité */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          {(['blocking', 'warning', 'info'] as const).map((s) =>
            counts[s] > 0 ? (
              <span key={s} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${SEVERITY[s].cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY[s].dot}`} /> {counts[s]} {SEVERITY[s].label.toLowerCase()}
              </span>
            ) : null,
          )}
          {open.length === 0 && !isLoading && (
            <span className="inline-flex items-center gap-1 text-green text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" /> Aucune anomalie ouverte
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Actions d'analyse */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => detectMutation.mutate()}
            disabled={analyzing}
            className="h-7 px-2.5 text-[11px] font-mono rounded border border-b1 bg-s2 text-t2 hover:bg-s3 flex items-center gap-1.5 disabled:opacity-40"
            title="Vérifications structurelles (instantané, sans IA)"
          >
            <RefreshCw className={`w-3 h-3 ${detectMutation.isPending ? 'animate-spin' : ''}`} /> Analyser
          </button>
          <button
            onClick={() => aiMutation.mutate()}
            disabled={analyzing}
            className="h-7 px-2.5 text-[11px] font-mono rounded border border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 flex items-center gap-1.5 disabled:opacity-40"
            title="Analyse de contenu par l'IA (texte tronqué, articles fusionnés, OCR…)"
          >
            <Sparkles className={`w-3 h-3 ${aiMutation.isPending ? 'animate-pulse' : ''}`} />
            {aiMutation.isPending ? 'Analyse IA…' : 'Analyse IA'}
          </button>
          <button
            onClick={() => setAnomaliesPanel(false)}
            className="w-7 h-7 rounded border border-b1 bg-s2 text-t3 hover:text-t1 hover:bg-s3 flex items-center justify-center"
            aria-label="Fermer le panneau d'anomalies"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="text-[12px] font-mono text-t3">Chargement…</div>
        ) : flags.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
            <ShieldCheck className="w-8 h-8 text-t4" />
            <div>
              <p className="text-[13px] text-t2 font-medium">Aucune anomalie pour l'instant</p>
              <p className="text-[11.5px] text-t3 mt-1 max-w-md">
                Lancez une analyse pour vérifier ce document : <strong>Analyser</strong> contrôle la structure
                (divisions vides, articles sans texte, numérotation) ; <strong>Analyse IA</strong> relit le
                contenu (texte tronqué, articles fusionnés, OCR illisible, renvois incohérents).
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {flags.map((flag) => {
              const sev = SEVERITY[flag.severity] ?? SEVERITY.info;
              return (
                <div
                  key={flag.id}
                  className={`rounded-lg border border-b1 bg-s2/40 p-2.5 flex flex-col gap-1.5 ${flag.resolved ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${sev.cls}`}>
                      {sev.label}
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-b1 text-t3">
                      {SOURCE_LABEL[flag.source] ?? flag.source}
                    </span>
                    <span className="text-[10px] font-mono text-t4 truncate">{flag.type_probleme}</span>
                    {flag.resolved && <span className="text-[9px] font-mono text-green ml-auto">résolue ✓</span>}
                  </div>

                  <p className="text-[12px] text-t1 leading-snug">{flag.description}</p>

                  {flag.suggestion?.text && (
                    <p className="text-[11px] text-t2 bg-gold/5 border border-gold/15 rounded px-2 py-1">
                      <span className="text-gold font-mono uppercase text-[9px] tracking-wider mr-1">Suggestion</span>
                      {flag.suggestion.text}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-auto pt-1">
                    <button
                      onClick={() => goToTarget(flag)}
                      className="h-6 px-2 text-[11px] rounded border border-b1 bg-s2 text-t2 hover:bg-s3 flex items-center gap-1"
                    >
                      <Crosshair className="w-3 h-3" /> Localiser
                    </button>
                    {flag.resolved ? (
                      <button
                        onClick={() => resolveMutation.mutate({ flagId: flag.id, resolved: false })}
                        disabled={resolveMutation.isPending}
                        className="h-6 px-2 text-[11px] rounded border border-b1 bg-s2 text-t3 hover:bg-s3 flex items-center gap-1 disabled:opacity-40"
                      >
                        <RotateCcw className="w-3 h-3" /> Rouvrir
                      </button>
                    ) : (
                      <button
                        onClick={() => resolveMutation.mutate({ flagId: flag.id, resolved: true })}
                        disabled={resolveMutation.isPending}
                        className="h-6 px-2 text-[11px] rounded border border-green/20 bg-green/10 text-green hover:bg-green/20 flex items-center gap-1 disabled:opacity-40"
                      >
                        <Check className="w-3 h-3" /> Résoudre
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

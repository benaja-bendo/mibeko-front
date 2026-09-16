/**
 * AVerifierPanel.tsx — Relecture dirigée d'un document (mibeko-front#44,
 * étape 4 du protocole de validation). Quatre blocs dans l'ordre imposé :
 * signalements bloquants, avertissements, points d'observation obligatoires,
 * sondage. Le serveur calcule les blocs 3 et 4 (mibeko-dashboard#142) — ce
 * composant ne recalcule jamais rien, il affiche et confirme.
 *
 * « Valider » enregistre la preuve de relecture PUIS transite vers
 * `validated` — en deux temps (`draft → review → validated`) si le document
 * est encore en brouillon, la machine à états de `LegalDocument` n'autorisant
 * pas `draft → validated` en une seule fois. « Publier » reste ailleurs
 * (garde-fou de publication déjà étendu par dashboard#142, qui lit la preuve
 * enregistrée ici).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDocumentCurationFlags,
  getRelectureRequise,
  enregistrerRelecture,
  bulkUpdateDocuments,
  type CurationFlagDto,
  type RelectureArticleRef,
} from '@/features/documents/api/laravelApi';
import { toast } from '@/shared/store/useToast';
import { Spinner } from './badges';

function ArticleCheckRow({
  documentId,
  article,
  checked,
  onToggle,
  confirmLabel,
}: {
  documentId: string;
  article: RelectureArticleRef;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  confirmLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-b1 last:border-b-0">
      <Link
        to={`/editor/viewer/${documentId}?article=${article.id}`}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-gold hover:underline font-mono truncate"
      >
        Art. {article.numero_article ?? '—'}
      </Link>
      <label className="flex items-center gap-1.5 text-xs text-t2 shrink-0 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          className="accent-gold"
        />
        {confirmLabel}
      </label>
    </div>
  );
}

function FlagRow({ documentId, flag }: { documentId: string; flag: CurationFlagDto }) {
  return (
    <div className="px-3 py-2 border-b border-b1 last:border-b-0 space-y-1">
      <div className="flex items-center gap-2">
        {flag.article_id ? (
          <Link
            to={`/editor/viewer/${documentId}?article=${flag.article_id}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-gold hover:underline font-mono shrink-0"
          >
            Voir dans le viewer
          </Link>
        ) : null}
        <span className="text-[10px] font-mono uppercase tracking-widest text-t4">{flag.type_probleme}</span>
      </div>
      <p className="text-xs text-t2">{flag.description}</p>
    </div>
  );
}

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-b1 rounded-lg overflow-hidden">
      <h3 className={`px-3 py-2 bg-s2 text-xs font-semibold border-b border-b1 ${accent}`}>
        {title} ({count})
      </h3>
      {children}
    </section>
  );
}

export function AVerifierPanel({
  documentId,
  curationStatus,
  onValidated,
}: {
  documentId: string;
  curationStatus?: string | null;
  onValidated: () => void;
}) {
  const queryClient = useQueryClient();
  const [pointsVus, setPointsVus] = useState<Set<string>>(new Set());
  const [sondageConfirmes, setSondageConfirmes] = useState<Set<string>>(new Set());

  const { data: flagsData, isLoading: flagsLoading } = useQuery({
    queryKey: ['curation-flags', documentId],
    queryFn: () => getDocumentCurationFlags(documentId, true),
  });
  const { data: relectureData, isLoading: relectureLoading } = useQuery({
    queryKey: ['relecture-requise', documentId],
    queryFn: () => getRelectureRequise(documentId),
  });

  // Nouveau document sélectionné : les cases cochées d'un autre document ne
  // doivent jamais survivre au changement de sélection.
  useEffect(() => {
    setPointsVus(new Set());
    setSondageConfirmes(new Set());
  }, [documentId]);

  const flags = flagsData?.data ?? [];
  const blocking = flags.filter((f) => f.severity === 'blocking');
  const warnings = flags.filter((f) => f.severity === 'warning');
  const requis = relectureData?.data;

  const pointsOk = !!requis && requis.points_obligatoires.every((a) => pointsVus.has(a.id));
  const sondageOk = !!requis && requis.sondage_articles.every((a) => sondageConfirmes.has(a.id));
  const peutValider = blocking.length === 0 && pointsOk && sondageOk && !!requis;

  const validerMutation = useMutation({
    mutationFn: async () => {
      if (!requis) throw new Error('Exigences de relecture non chargées.');

      await enregistrerRelecture(documentId, {
        points_vus: requis.points_obligatoires.map((a) => a.id),
        sondage_confirmes: requis.sondage_articles.map((a) => a.id),
      });

      // draft → validated n'existe pas dans la machine à états : un document
      // encore en brouillon passe d'abord par review.
      if (curationStatus === 'draft') {
        await bulkUpdateDocuments({ ids: [documentId], action: 'set_curation_status', value: 'review' });
      }

      return bulkUpdateDocuments({ ids: [documentId], action: 'set_curation_status', value: 'validated' });
    },
    onSuccess: () => {
      toast.success('Document validé.');
      queryClient.invalidateQueries({ queryKey: ['python-documents'] });
      onValidated();
    },
    onError: (err) => toast.fromError(err, 'Erreur de validation'),
  });

  if (flagsLoading || relectureLoading) {
    return (
      <div className="h-full flex items-center justify-center text-t3 text-sm gap-2">
        <Spinner className="w-4 h-4" /> Chargement…
      </div>
    );
  }

  const reserves = blocking.length + warnings.length;

  return (
    <div className="h-full overflow-y-auto space-y-3 pr-1">
      {/* Vocabulaire sous contrainte (protocole, règle 5) : jamais « propre »/« prêt ». */}
      <div className="text-[11px] font-mono uppercase tracking-widest text-t3">
        Contrôlé, {reserves} réserve{reserves > 1 ? 's' : ''} ouverte{reserves > 1 ? 's' : ''}
      </div>

      <Section title="Signalements bloquants" count={blocking.length} accent="text-red">
        {blocking.length === 0 ? (
          <p className="px-3 py-2 text-xs text-t3">Aucun.</p>
        ) : (
          blocking.map((f) => <FlagRow key={f.id} documentId={documentId} flag={f} />)
        )}
      </Section>

      <Section title="Avertissements" count={warnings.length} accent="text-amber">
        {warnings.length === 0 ? (
          <p className="px-3 py-2 text-xs text-t3">Aucun.</p>
        ) : (
          warnings.map((f) => <FlagRow key={f.id} documentId={documentId} flag={f} />)
        )}
      </Section>

      <Section
        title="Points d'observation obligatoires"
        count={requis ? requis.points_obligatoires.length : 0}
        accent="text-t1"
      >
        {!requis || requis.points_obligatoires.length === 0 ? (
          <p className="px-3 py-2 text-xs text-t3">Aucun.</p>
        ) : (
          requis.points_obligatoires.map((a) => (
            <ArticleCheckRow
              key={a.id}
              documentId={documentId}
              article={a}
              checked={pointsVus.has(a.id)}
              confirmLabel="Vu"
              onToggle={(checked) =>
                setPointsVus((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(a.id);
                  else next.delete(a.id);
                  return next;
                })
              }
            />
          ))
        )}
      </Section>

      <Section title="Sondage" count={requis ? requis.sondage_articles.length : 0} accent="text-t1">
        {!requis || requis.sondage_articles.length === 0 ? (
          <p className="px-3 py-2 text-xs text-t3">Aucun.</p>
        ) : (
          requis.sondage_articles.map((a) => (
            <ArticleCheckRow
              key={a.id}
              documentId={documentId}
              article={a}
              checked={sondageConfirmes.has(a.id)}
              confirmLabel="Confirmé"
              onToggle={(checked) =>
                setSondageConfirmes((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(a.id);
                  else next.delete(a.id);
                  return next;
                })
              }
            />
          ))
        )}
      </Section>

      <button
        onClick={() => validerMutation.mutate()}
        disabled={!peutValider || validerMutation.isPending}
        className="w-full px-4 py-2 rounded-md bg-gold text-black font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {validerMutation.isPending ? 'Validation…' : 'Valider'}
      </button>
    </div>
  );
}

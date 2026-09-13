import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Archive, CheckCircle2, Eye, Plus, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import AppLayout from '@/widgets/layout/AppLayout';
import { Button } from '@/shared/components/ui/Button';
import { useOnboardingAdminMutations, useOnboardingJourneys } from '@/features/admin/hooks/useOnboardingAdmin';
import type {
  AdminOnboardingBinding,
  AdminOnboardingCondition,
  AdminOnboardingJourney,
  AdminOnboardingOption,
  AdminOnboardingScope,
  AdminOnboardingStep,
  OnboardingPreview,
} from '@/features/admin/api/onboardingAdminApi';
import type { OnboardingStepType } from '@/features/onboarding/types';
import { onboardingCopy } from '@/features/onboarding/lib/onboardingCopy';

const STEP_TYPES: Array<{ value: OnboardingStepType; label: string }> = [
  { value: 'welcome', label: 'Accueil' },
  { value: 'single_choice', label: 'Choix unique' },
  { value: 'multi_choice', label: 'Choix multiple' },
  { value: 'optional_field', label: 'Champ facultatif' },
  { value: 'guided_action', label: 'Action guidée' },
  { value: 'checklist', label: 'Checklist' },
];

const BINDINGS: Array<{ value: AdminOnboardingBinding | ''; label: string }> = [
  { value: '', label: 'Aucun champ profil' },
  { value: 'profile.usage_context', label: 'Cadre d’usage' },
  { value: 'profile.interests', label: 'Centres d’intérêt' },
  { value: 'profile.job_title', label: 'Métier' },
  { value: 'profile.company', label: 'Organisation' },
  { value: 'profile.phone', label: 'Téléphone' },
];

const inputClass = 'w-full rounded-md border border-b1 bg-s1 px-3 py-2 text-sm text-t1 outline-none focus:border-gold';
const labelClass = 'block text-[10px] font-mono uppercase tracking-widest text-t4 mb-1';

function optionsText(options: AdminOnboardingOption[] | undefined): string {
  return (options ?? []).map((option) => `${option.code} | ${option.label ?? option.label_key ?? ''}`).join('\n');
}

function parseOptions(value: string): AdminOnboardingOption[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [code, ...label] = line.split('|');
    return { code: code.trim(), label: label.join('|').trim() };
  });
}

function defaultStep(index: number, type: OnboardingStepType = 'welcome'): AdminOnboardingStep {
  const config = type === 'single_choice'
    ? { title: 'Nouvelle question', options: [{ code: 'option_1', label: 'Première option' }] }
    : type === 'multi_choice'
      ? { title: 'Nouvelle question', options: [] }
      : type === 'checklist'
        ? { title: 'Pour bien démarrer', items: [] }
        : { title: 'Nouvelle étape', body: 'Ajoutez une explication utile.' };

  return { key: `step_${index}`, type, scope: 'common', binding: null, config, conditions: [] };
}

function statusLabel(journey: AdminOnboardingJourney): string {
  if (journey.is_active) return 'Active';
  if (journey.status === 'draft') return 'Brouillon';
  if (journey.status === 'archived') return 'Archivée';
  return 'Publiée';
}

function definitionChanges(active: AdminOnboardingStep[] | undefined, draft: AdminOnboardingStep[]) {
  const activeByKey = new Map((active ?? []).map((step, index) => [step.key, { step, index }]));
  const draftKeys = new Set(draft.map((step) => step.key));
  const added = draft.filter((step) => !activeByKey.has(step.key)).length;
  const removed = (active ?? []).filter((step) => !draftKeys.has(step.key)).length;
  const modified = draft.filter((step) => {
    const previous = activeByKey.get(step.key);
    return previous && JSON.stringify(previous.step) !== JSON.stringify(step);
  }).length;
  const moved = draft.filter((step, index) => {
    const previous = activeByKey.get(step.key);
    return previous && previous.index !== index;
  }).length;

  return { added, removed, modified, moved };
}

function Feedback({ error, success }: { error?: Error | null; success?: string | null }) {
  if (error) return <p role="alert" className="text-xs text-red">{error.message}</p>;
  if (success) return <p role="status" className="text-xs text-green">{success}</p>;
  return null;
}

function StepEditor({
  step,
  index,
  previousSteps,
  onChange,
  onMove,
  onRemove,
}: {
  step: AdminOnboardingStep;
  index: number;
  previousSteps: AdminOnboardingStep[];
  onChange: (step: AdminOnboardingStep) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const setConfig = (patch: Partial<AdminOnboardingStep['config']>) => onChange({ ...step, config: { ...step.config, ...patch } });
  const optionField = step.type === 'checklist' ? 'items' : 'options';
  const hasOptions = ['single_choice', 'multi_choice', 'checklist'].includes(step.type)
    && step.config.source !== 'tags:themes-de-vie';
  const conditionSources = previousSteps.filter((previous) => previous.type === 'single_choice');

  function changeType(type: OnboardingStepType) {
    const fresh = defaultStep(index + 1, type);
    onChange({ ...fresh, key: step.key, scope: step.scope, config: { ...fresh.config, title: step.config.title } });
  }

  function addCondition() {
    const source = conditionSources.at(-1);
    if (!source) return;
    onChange({ ...step, conditions: [...step.conditions, { step_key: source.key, operator: 'equals', value: '' }] });
  }

  function updateCondition(conditionIndex: number, patch: Partial<AdminOnboardingCondition>) {
    onChange({ ...step, conditions: step.conditions.map((condition, i) => i === conditionIndex ? { ...condition, ...patch } : condition) });
  }

  return (
    <article className="rounded-xl border border-b1 bg-s1 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-s2 font-mono text-[11px] text-t3">{index + 1}</span>
        <input aria-label={`Identifiant étape ${index + 1}`} className={`${inputClass} max-w-56 font-mono`} value={step.key}
          onChange={(event) => onChange({ ...step, key: event.target.value })} />
        <div className="ml-auto flex gap-1">
          <button type="button" aria-label="Monter l’étape" disabled={index === 0} onClick={() => onMove(-1)} className="p-1.5 text-t3 disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button>
          <button type="button" aria-label="Descendre l’étape" onClick={() => onMove(1)} className="p-1.5 text-t3"><ArrowDown className="h-4 w-4" /></button>
          <button type="button" aria-label="Supprimer l’étape" onClick={onRemove} className="p-1.5 text-red"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label><span className={labelClass}>Composant</span><select className={inputClass} value={step.type} onChange={(e) => changeType(e.target.value as OnboardingStepType)}>{STEP_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        <label><span className={labelClass}>Surface</span><select className={inputClass} value={step.scope} onChange={(e) => onChange({ ...step, scope: e.target.value as AdminOnboardingScope })}><option value="common">Web et mobile</option><option value="web">Web uniquement</option><option value="mobile">Mobile uniquement</option></select></label>
        <label><span className={labelClass}>Champ profil</span><select className={inputClass} value={step.binding ?? ''} onChange={(e) => onChange({ ...step, binding: (e.target.value || null) as AdminOnboardingBinding | null })}>{BINDINGS.map((binding) => <option key={binding.value} value={binding.value}>{binding.label}</option>)}</select></label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label><span className={labelClass}>Titre</span><input className={inputClass} value={step.config.title ?? ''} onChange={(e) => setConfig({ title: e.target.value })} maxLength={160} /></label>
        <label><span className={labelClass}>Bouton</span><input className={inputClass} value={step.config.cta ?? ''} onChange={(e) => setConfig({ cta: e.target.value })} placeholder="Continuer" maxLength={160} /></label>
      </div>
      <label><span className={labelClass}>Explication</span><textarea className={`${inputClass} min-h-20 resize-y`} value={step.config.body ?? ''} onChange={(e) => setConfig({ body: e.target.value })} maxLength={600} /></label>
      <label><span className={labelClass}>Exemples — un par ligne, cinq maximum</span><textarea className={`${inputClass} min-h-20 resize-y`} value={(step.config.examples ?? []).join('\n')} onChange={(e) => setConfig({ examples: e.target.value.split('\n').map((value) => value.trim()).filter(Boolean) })} /></label>

      {step.type === 'multi_choice' && (
        <label className="flex items-center gap-2 text-xs text-t2">
          <input type="checkbox" checked={step.config.source === 'tags:themes-de-vie'} onChange={(e) => setConfig(e.target.checked ? { source: 'tags:themes-de-vie', options: undefined } : { source: undefined, options: [] })} />
          Utiliser automatiquement les thèmes de vie
        </label>
      )}
      {hasOptions && (
        <label><span className={labelClass}>Choix — un par ligne : code | libellé</span><textarea className={`${inputClass} min-h-24 font-mono text-xs`} value={optionsText(step.config[optionField])} onChange={(e) => setConfig({ [optionField]: parseOptions(e.target.value) })} /></label>
      )}

      <div className="rounded-lg border border-b1 bg-s2/40 p-3 space-y-2">
        <div className="flex items-center justify-between"><span className={labelClass}>Conditions simples — réponses à choix unique</span><Button type="button" variant="ghost" size="sm" onClick={addCondition} disabled={conditionSources.length === 0}>Ajouter</Button></div>
        {step.conditions.length === 0 && <p className="text-xs text-t4">Toujours affichée sur la surface choisie.</p>}
        {step.conditions.map((condition, conditionIndex) => (
          <div key={`${condition.step_key}-${conditionIndex}`} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
            <select aria-label="Étape conditionnelle" className={inputClass} value={condition.step_key} onChange={(e) => updateCondition(conditionIndex, { step_key: e.target.value })}>{conditionSources.map((previous) => <option key={previous.key} value={previous.key}>{previous.key}</option>)}</select>
            <select aria-label="Opérateur" className={inputClass} value={condition.operator} onChange={(e) => updateCondition(conditionIndex, { operator: e.target.value as AdminOnboardingCondition['operator'] })}><option value="equals">est égal à</option><option value="not_equals">est différent de</option><option value="in">fait partie de</option></select>
            <input aria-label="Valeur conditionnelle" className={inputClass} value={Array.isArray(condition.value) ? condition.value.join(', ') : String(condition.value ?? '')} onChange={(e) => updateCondition(conditionIndex, { value: condition.operator === 'in' ? e.target.value.split(',').map((v) => v.trim()).filter(Boolean) : e.target.value })} />
            <button type="button" aria-label="Retirer la condition" className="p-2 text-red" onClick={() => onChange({ ...step, conditions: step.conditions.filter((_, i) => i !== conditionIndex) })}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </article>
  );
}

function PreviewPanel({ preview }: { preview: OnboardingPreview }) {
  return (
    <section aria-label="Prévisualisation" className="rounded-xl border border-gold/20 bg-gold/5 p-4 space-y-3">
      <div><h2 className="font-display text-lg text-t1">Prévisualisation {preview.platform}</h2><p className="text-xs text-t3">Aucune donnée utilisateur écrite · aucun appel IA.</p></div>
      <div className="space-y-2">{preview.steps.map((step, index) => <div key={step.key} className="rounded-lg border border-b1 bg-s1 p-3"><div className="flex justify-between"><span className="font-mono text-xs text-t3">{index + 1}. {step.key}</span>{!step.supported && <span className="text-xs text-amber">Ignorée par cet ancien client</span>}</div><h3 className="mt-2 font-medium text-t1">{step.config.title ?? onboardingCopy(step.config.title_key, step.key)}</h3>{(step.config.body ?? onboardingCopy(step.config.body_key, '')) && <p className="mt-1 text-sm text-t2">{step.config.body ?? onboardingCopy(step.config.body_key, '')}</p>}{step.config.examples?.map((example) => <p key={example} className="mt-1 text-xs text-t3">Exemple : {example}</p>)}</div>)}</div>
    </section>
  );
}

export default function OnboardingAdminPage() {
  const journeys = useOnboardingJourneys();
  const mutations = useOnboardingAdminMutations();
  const [definition, setDefinition] = useState<AdminOnboardingStep[]>([]);
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'web' | 'mobile'>('web');
  const [persona, setPersona] = useState('personal');
  const [legacyClient, setLegacyClient] = useState(false);
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [definitionValidated, setDefinitionValidated] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const draft = journeys.data?.find((journey) => journey.status === 'draft');
  const active = journeys.data?.find((journey) => journey.is_active);
  const history = journeys.data?.filter((journey) => journey.status !== 'draft') ?? [];
  const dirty = !!draft && JSON.stringify(definition) !== JSON.stringify(draft.definition);
  const changes = definitionChanges(active?.definition, definition);

  useEffect(() => {
    if (draft && draft.id !== loadedDraftId) {
      setDefinition(draft.definition);
      setLoadedDraftId(draft.id);
      setDefinitionValidated(false);
      setPublishConfirmed(false);
    }
    if (!draft && loadedDraftId !== null) {
      setDefinition([]);
      setLoadedDraftId(null);
    }
  }, [draft, loadedDraftId]);

  const knownTypes = useMemo<OnboardingStepType[] | undefined>(() => legacyClient
    ? ['welcome', 'single_choice', 'multi_choice', 'guided_action']
    : undefined, [legacyClient]);

  function changeStep(index: number, step: AdminOnboardingStep) {
    setDefinition((current) => current.map((candidate, i) => i === index ? step : candidate));
    setMessage(null);
    setDefinitionValidated(false);
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= definition.length) return;
    const next = [...definition];
    [next[index], next[target]] = [next[target], next[index]];
    setDefinition(next);
    setDefinitionValidated(false);
  }

  function save() {
    if (!draft) return;
    mutations.saveDraft.mutate({ id: draft.id, definition }, { onSuccess: (saved) => { setDefinition(saved.definition); setDefinitionValidated(true); setMessage('Brouillon enregistré et validé.'); } });
  }

  function validate() {
    mutations.validate.mutate(definition, { onSuccess: (result) => { setDefinitionValidated(true); setMessage(`Définition valide : ${result.steps_count} étapes compatibles web et mobile.`); } });
  }

  function preview() {
    mutations.preview.mutate({ definition, platform, known_step_types: knownTypes, answers: { usage_context: persona } });
  }

  function publish() {
    if (!draft || !publishConfirmed || dirty) return;
    mutations.publish.mutate(draft.id, { onSuccess: () => { setPublishConfirmed(false); setMessage('Nouvelle version publiée pour les futurs inscrits.'); } });
  }

  const error = mutations.createDraft.error ?? mutations.saveDraft.error ?? mutations.validate.error ?? mutations.preview.error ?? mutations.publish.error ?? mutations.rollback.error ?? mutations.archive.error;

  return (
    <AppLayout space="admin">
      <div className="flex h-full flex-col">
        <header className="border-b border-b1 px-6 py-5"><h1 className="font-display text-xl font-semibold text-t1">Parcours d’onboarding</h1><p className="mt-0.5 text-xs font-mono text-t3">Édition déclarative, prévisualisation sûre et publication versionnée</p></header>
        <div className="flex-1 overflow-auto p-6"><div className="mx-auto max-w-6xl space-y-6">
          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-b1 bg-s1 p-4"><span className={labelClass}>Version active</span><strong className="text-t1">{active ? `v${active.version}` : 'Aucune'}</strong><p className="mt-1 text-xs text-t3">{active?.enrollments_count ?? 0} compte(s) épinglé(s)</p></div>
            <div className="rounded-xl border border-b1 bg-s1 p-4"><span className={labelClass}>Brouillon</span><strong className="text-t1">{draft ? `v${draft.version}` : 'Aucun'}</strong><p className="mt-1 text-xs text-t3">Une seule version éditable à la fois</p></div>
            <div className="rounded-xl border border-b1 bg-s1 p-4"><span className={labelClass}>Règle de diffusion</span><strong className="text-t1">Nouveaux inscrits</strong><p className="mt-1 text-xs text-t3">Les parcours commencés restent inchangés</p></div>
          </section>

          {!draft ? <section className="rounded-xl border border-dashed border-b2 p-8 text-center"><p className="mb-4 text-sm text-t2">Créez un brouillon à partir de la version active.</p><Button variant="gold" onClick={() => mutations.createDraft.mutate()} disabled={mutations.createDraft.isPending}><Plus className="h-4 w-4" /> Créer le brouillon</Button></section> : <>
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg text-t1">Brouillon v{draft.version}</h2><p className="text-xs text-t3">Types et champs sont limités au catalogue supporté par les applications.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => mutations.archive.mutate(draft.id)}><Archive className="h-4 w-4" /> Archiver</Button><Button variant="outline" onClick={validate} disabled={dirty || mutations.validate.isPending}><CheckCircle2 className="h-4 w-4" /> Valider</Button><Button variant="gold" onClick={save} disabled={!dirty || mutations.saveDraft.isPending}><Save className="h-4 w-4" /> Enregistrer</Button></div></div>
              {definition.map((step, index) => <StepEditor key={`${step.key}-${index}`} step={step} index={index} previousSteps={definition.slice(0, index)} onChange={(next) => changeStep(index, next)} onMove={(direction) => moveStep(index, direction)} onRemove={() => { setDefinition((current) => current.filter((_, i) => i !== index)); setDefinitionValidated(false); }} />)}
              <div className="flex flex-wrap gap-2">{STEP_TYPES.map((type) => <Button key={type.value} type="button" variant="outline" size="sm" onClick={() => { setDefinition((current) => [...current, defaultStep(current.length + 1, type.value)]); setDefinitionValidated(false); }}><Plus className="h-3.5 w-3.5" /> {type.label}</Button>)}</div>
            </section>

            <section className="rounded-xl border border-b1 bg-s1 p-4 space-y-4"><div><h2 className="font-display text-lg text-t1">Tester les variantes</h2><p className="text-xs text-t3">Le serveur applique les surfaces, conditions et capacités sans créer de progression.</p></div><div className="grid gap-3 md:grid-cols-3"><label><span className={labelClass}>Plateforme</span><select className={inputClass} value={platform} onChange={(e) => setPlatform(e.target.value as 'web' | 'mobile')}><option value="web">Web</option><option value="mobile">Mobile</option></select></label><label><span className={labelClass}>Cadre d’usage</span><select className={inputClass} value={persona} onChange={(e) => setPersona(e.target.value)}><option value="personal">Personnel</option><option value="studies">Étudiant</option><option value="professional">Professionnel</option><option value="other">Autre</option></select></label><label className="flex items-end gap-2 pb-2 text-sm text-t2"><input type="checkbox" checked={legacyClient} onChange={(e) => setLegacyClient(e.target.checked)} /> Anciennes capacités</label></div><Button variant="outline" onClick={preview} disabled={mutations.preview.isPending}><Eye className="h-4 w-4" /> Prévisualiser sans écrire</Button></section>
            {mutations.preview.data && <PreviewPanel preview={mutations.preview.data} />}

            <section className="rounded-xl border border-amber/25 bg-amber-d p-4 space-y-3"><h2 className="font-display text-lg text-t1">Publier v{draft.version}</h2><p className="text-sm text-t2">La nouvelle version deviendra active pour les futurs inscrits. Les {active?.enrollments_count ?? 0} comptes déjà inscrits conserveront définitivement leur version actuelle.</p><div className="rounded-lg border border-b1 bg-s1/70 p-3 text-xs text-t2"><strong className="text-t1">Comparaison avec v{active?.version ?? '—'} :</strong> {changes.added} ajoutée(s), {changes.removed} retirée(s), {changes.modified} modifiée(s), {changes.moved} déplacée(s).</div><label className="flex items-start gap-2 text-sm text-t2"><input className="mt-1" type="checkbox" checked={publishConfirmed} onChange={(e) => setPublishConfirmed(e.target.checked)} /> Je confirme la population ciblée et l’immuabilité après publication.</label><Button variant="gold" onClick={publish} disabled={!publishConfirmed || dirty || !definitionValidated || mutations.publish.isPending}><Send className="h-4 w-4" /> Publier la version</Button>{dirty && <p className="text-xs text-amber">Enregistrez le brouillon avant de publier.</p>}{!dirty && !definitionValidated && <p className="text-xs text-amber">Validez la définition avant de publier.</p>}</section>
          </>}

          <Feedback error={error as Error | null} success={message} />

          <section className="space-y-3"><h2 className="font-display text-lg text-t1">Historique immuable</h2><div className="overflow-hidden rounded-xl border border-b1 bg-s1 divide-y divide-b1">{history.map((journey) => <div key={journey.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-24"><strong className="text-t1">v{journey.version}</strong><span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-mono ${journey.is_active ? 'bg-green-d text-green' : 'bg-s2 text-t3'}`}>{statusLabel(journey)}</span></div><div className="flex-1 text-xs text-t3">{journey.steps_count} étapes · {journey.enrollments_count} inscrits · {journey.published_at ? new Date(journey.published_at).toLocaleString('fr-FR') : 'jamais publiée'}</div>{!journey.is_active && journey.status !== 'draft' && <Button variant="outline" size="sm" onClick={() => mutations.rollback.mutate(journey.id)} disabled={!!draft}><RotateCcw className="h-3.5 w-3.5" /> Restaurer dans une nouvelle version</Button>}</div>)}</div></section>
        </div></div>
      </div>
    </AppLayout>
  );
}

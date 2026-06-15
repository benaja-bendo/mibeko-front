/**
 * dossiersApi.ts — Accès réseau de la feature Dossiers (backend Laravel).
 *
 * CRUD « affaire » sur `/dossiers` (+ échéances nichées et endpoints dédiés).
 * Toutes les réponses suivent l'enveloppe { success, message, data } ; on
 * déballe `data.data`. Le mapping vocabulaire web ↔ colonnes serveur (camelCase
 * ↔ snake_case) est centralisé ici.
 */

import { laravelClient } from '@/shared/api';
import type {
  CreateDossierInput,
  DossierRecord,
  Echeance,
  EcheanceInput,
  UpdateDossierInput,
} from '@/features/dossiers/types';

// ── Mapping API → modèle ─────────────────────────────────────────────────────

/** Forme brute d'une échéance renvoyée par l'API. */
interface ApiEcheance {
  id: string;
  dossier_id: string;
  type: Echeance['type'];
  title: string;
  due_date: string | null;
  status: Echeance['status'];
  trigger_event: string | null;
  trigger_date: string | null;
  rule_id: string | null;
  basis_article_id: string | null;
  is_confirmed: boolean;
  reminders: number[];
  note: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Forme brute d'un dossier renvoyée par l'API. */
interface ApiDossier {
  id: string;
  type: DossierRecord['type'];
  title: string;
  reference: string | null;
  client: string | null;
  client_role: DossierRecord['clientRole'] | null;
  adverse: string | null;
  jurisdiction: string | null;
  nature: string | null;
  matiere: string | null;
  status: DossierRecord['status'];
  description: string | null;
  color: string | null;
  echeances?: ApiEcheance[];
  created_at: string;
  updated_at: string;
}

function mapEcheance(api: ApiEcheance): Echeance {
  return {
    id: api.id,
    dossierId: api.dossier_id,
    type: api.type,
    title: api.title,
    dueDate: api.due_date ?? null,
    status: api.status,
    triggerEvent: api.trigger_event ?? null,
    triggerDate: api.trigger_date ?? null,
    ruleId: api.rule_id ?? null,
    basisArticleId: api.basis_article_id ?? null,
    isConfirmed: Boolean(api.is_confirmed),
    reminders: api.reminders ?? [],
    note: api.note ?? null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

function mapRecord(api: ApiDossier): DossierRecord {
  return {
    id: api.id,
    type: api.type,
    title: api.title,
    reference: api.reference ?? undefined,
    client: api.client ?? undefined,
    clientRole: api.client_role ?? undefined,
    adverse: api.adverse ?? undefined,
    jurisdiction: api.jurisdiction ?? undefined,
    nature: api.nature ?? undefined,
    matiere: api.matiere ?? undefined,
    status: api.status,
    description: api.description ?? undefined,
    color: api.color ?? undefined,
    echeances: (api.echeances ?? []).map(mapEcheance),
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

// ── Mapping modèle → API ─────────────────────────────────────────────────────

const DOSSIER_FIELD_MAP: Record<string, string> = {
  type: 'type',
  title: 'title',
  reference: 'reference',
  client: 'client',
  clientRole: 'client_role',
  adverse: 'adverse',
  jurisdiction: 'jurisdiction',
  nature: 'nature',
  matiere: 'matiere',
  description: 'description',
  status: 'status',
};

/** N'envoie que les champs réellement fournis (mise à jour partielle). */
function dossierToApi(input: Partial<CreateDossierInput & UpdateDossierInput>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [camel, snake] of Object.entries(DOSSIER_FIELD_MAP)) {
    if (camel in input && (input as Record<string, unknown>)[camel] !== undefined) {
      body[snake] = (input as Record<string, unknown>)[camel];
    }
  }
  return body;
}

function echeanceToApi(input: EcheanceInput): Record<string, unknown> {
  const body: Record<string, unknown> = { type: input.type, title: input.title };
  if (input.dueDate !== undefined) body.due_date = input.dueDate;
  if (input.status !== undefined) body.status = input.status;
  if (input.reminders !== undefined) body.reminders = input.reminders;
  if (input.note !== undefined) body.note = input.note;
  if (input.triggerEvent !== undefined) body.trigger_event = input.triggerEvent;
  if (input.triggerDate !== undefined) body.trigger_date = input.triggerDate;
  return body;
}

// ── Dossiers ─────────────────────────────────────────────────────────────────

/** Liste « affaire » complète des dossiers de l'utilisateur (échéances incluses). */
export async function listDossiers(): Promise<DossierRecord[]> {
  const { data } = await laravelClient.get('dossiers', { params: { full: 1 } });
  return (data.data as ApiDossier[]).map(mapRecord);
}

/** Détail d'un dossier. */
export async function getDossier(id: string): Promise<DossierRecord> {
  const { data } = await laravelClient.get(`dossiers/${id}`);
  return mapRecord(data.data);
}

/** Crée un dossier (et ses échéances initiales). */
export async function createDossier(input: CreateDossierInput): Promise<DossierRecord> {
  const body = dossierToApi(input);
  if (input.echeances?.length) {
    body.echeances = input.echeances.map(echeanceToApi);
  }
  const { data } = await laravelClient.post('dossiers', body);
  return mapRecord(data.data);
}

/** Met à jour partiellement un dossier. */
export async function updateDossier(
  id: string,
  patch: UpdateDossierInput,
): Promise<DossierRecord> {
  const { data } = await laravelClient.patch(`dossiers/${id}`, dossierToApi(patch));
  return mapRecord(data.data);
}

/** Supprime (soft delete) un dossier. */
export async function deleteDossier(id: string): Promise<void> {
  await laravelClient.delete(`dossiers/${id}`);
}

// ── Échéances ─────────────────────────────────────────────────────────────────

export async function createEcheance(
  dossierId: string,
  input: EcheanceInput,
): Promise<Echeance> {
  const { data } = await laravelClient.post(
    `dossiers/${dossierId}/echeances`,
    echeanceToApi(input),
  );
  return mapEcheance(data.data);
}

export async function updateEcheance(
  id: string,
  patch: EcheanceInput,
): Promise<Echeance> {
  const { data } = await laravelClient.patch(`echeances/${id}`, echeanceToApi(patch));
  return mapEcheance(data.data);
}

export async function deleteEcheance(id: string): Promise<void> {
  await laravelClient.delete(`echeances/${id}`);
}

// ── Export PDF (inchangé) ─────────────────────────────────────────────────────

export interface DossierExportItem {
  type: 'article' | 'document';
  /** UUID de l'article/document côté base juridique. */
  id: string;
  note?: string | null;
}

export interface DossierExportPayload {
  title: string;
  description?: string;
  items: DossierExportItem[];
}

/**
 * Génère et télécharge le PDF de synthèse d'un dossier à partir de ses
 * références juridiques. Le backend renvoie les octets bruts du PDF.
 */
export async function exportDossierPdf(
  payload: DossierExportPayload,
): Promise<void> {
  const res = await laravelClient.post('dossiers/export-pdf', payload, {
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${payload.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
}

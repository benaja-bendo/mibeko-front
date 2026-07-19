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
  Dossier,
  DossierRecord,
  Echeance,
  EcheanceInput,
  GeneratedDocument,
  LegalReference,
  Piece,
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

/**
 * Forme brute d'une référence juridique renvoyée par l'API.
 *
 * `id` EST l'UUID de la cible (article/document), conformément à la Resource
 * backend (`DossierReferenceResource` expose `target_id` sous la clé `id`) et au
 * modèle front `LegalReference.id`. Le backend n'expose pas d'id de ligne dédié.
 */
interface ApiReference {
  id: string;
  type: LegalReference['type'];
  title: string;
  breadcrumb: string | null;
  number: string | null;
  note: string | null;
}

/** Forme brute d'une pièce renvoyée par l'API. */
interface ApiPiece {
  id: string;
  name: string;
  size: number;
  mime: string;
  note: string | null;
  added_at: string;
}

/** Forme brute d'un document généré renvoyé par l'API. */
interface ApiDocument {
  id: string;
  template_id: string;
  template_name: string;
  title: string;
  html: string;
  created_at: string;
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
  references?: ApiReference[];
  pieces?: ApiPiece[];
  documents?: ApiDocument[];
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

/**
 * Mappe une référence serveur vers le modèle web. Le champ `id` exposé est
 * l'UUID de l'article/document (clé de déduplication et cible des suppressions),
 * conformément au contrat `LegalReference.id`.
 */
function mapReference(api: ApiReference): LegalReference {
  return {
    id: api.id,
    type: api.type,
    title: api.title,
    breadcrumb: api.breadcrumb ?? undefined,
    number: api.number ?? null,
    note: api.note ?? undefined,
  };
}

function mapPiece(api: ApiPiece): Piece {
  return {
    id: api.id,
    name: api.name,
    size: api.size,
    mime: api.mime,
    note: api.note ?? undefined,
    addedAt: api.added_at,
  };
}

function mapDocument(api: ApiDocument): GeneratedDocument {
  return {
    id: api.id,
    templateId: api.template_id,
    templateName: api.template_name,
    title: api.title,
    html: api.html,
    createdAt: api.created_at,
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

/**
 * Mappe un dossier complet : cœur « affaire » + annexes nichées. L'API renvoie
 * les trois collections (references/pieces/documents) avec le dossier, de sorte
 * qu'un dossier est chargé entièrement en une seule requête.
 */
function mapDossier(api: ApiDossier): Dossier {
  return {
    ...mapRecord(api),
    references: (api.references ?? []).map(mapReference),
    pieces: (api.pieces ?? []).map(mapPiece),
    documents: (api.documents ?? []).map(mapDocument),
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

/**
 * Liste complète des dossiers de l'utilisateur : cœur « affaire », échéances ET
 * annexes (références, pièces, documents) nichées — tout en une seule requête.
 */
export async function listDossiers(): Promise<Dossier[]> {
  const { data } = await laravelClient.get('dossiers', { params: { full: 1 } });
  return (data.data as ApiDossier[]).map(mapDossier);
}

/** Détail d'un dossier complet (cœur + échéances + annexes). */
export async function getDossier(id: string): Promise<Dossier> {
  const { data } = await laravelClient.get(`dossiers/${id}`);
  return mapDossier(data.data);
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

// ── Annexes : références juridiques ───────────────────────────────────────────

/** Saisie d'une référence (l'`id` est l'UUID de l'article/document). */
export type AddReferenceInput = Omit<LegalReference, 'note'> & { note?: string };

/**
 * Rattache une référence au dossier. Le backend déduplique par la cible (`id` =
 * UUID article/document) : ajouter deux fois le même article/document renvoie la
 * référence existante sans doublon.
 */
export async function addReference(
  dossierId: string,
  input: AddReferenceInput,
): Promise<LegalReference> {
  const body = {
    id: input.id,
    type: input.type,
    title: input.title,
    breadcrumb: input.breadcrumb ?? null,
    number: input.number ?? null,
    note: input.note ?? null,
  };
  const { data } = await laravelClient.post(
    `dossiers/${dossierId}/references`,
    body,
  );
  return mapReference(data.data);
}

/** Détache une référence (résolue par l'UUID article/document dans le dossier). */
export async function removeReference(
  dossierId: string,
  refId: string,
): Promise<void> {
  await laravelClient.delete(`dossiers/${dossierId}/references/${refId}`);
}

// ── Annexes : pièces ──────────────────────────────────────────────────────────

/** Métadonnées d'une pièce (aucun binaire versé dans cette itération). */
export type AddPieceInput = Omit<Piece, 'id' | 'addedAt'>;

export async function addPiece(
  dossierId: string,
  input: AddPieceInput,
): Promise<Piece> {
  const body = {
    name: input.name,
    size: input.size,
    mime: input.mime,
    note: input.note ?? null,
  };
  const { data } = await laravelClient.post(`dossiers/${dossierId}/pieces`, body);
  return mapPiece(data.data);
}

export async function removePiece(
  dossierId: string,
  pieceId: string,
): Promise<void> {
  await laravelClient.delete(`dossiers/${dossierId}/pieces/${pieceId}`);
}

// ── Annexes : documents générés ───────────────────────────────────────────────

export type AddDocumentInput = Omit<GeneratedDocument, 'id' | 'createdAt'>;

export async function addDocument(
  dossierId: string,
  input: AddDocumentInput,
): Promise<GeneratedDocument> {
  const body = {
    template_id: input.templateId,
    template_name: input.templateName,
    title: input.title,
    html: input.html,
  };
  const { data } = await laravelClient.post(
    `dossiers/${dossierId}/documents`,
    body,
  );
  return mapDocument(data.data);
}

export async function removeDocument(
  dossierId: string,
  docId: string,
): Promise<void> {
  await laravelClient.delete(`dossiers/${dossierId}/documents/${docId}`);
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

/**
 * dossiersApi.ts — Accès réseau de la feature Dossiers.
 *
 * Seul l'export PDF est aujourd'hui couvert par le backend Laravel
 * (`POST /dossiers/export-pdf`). Le reste du CRUD est local (cf. store).
 */

import { laravelClient } from '@/shared/api';

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

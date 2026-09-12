import { laravelClient } from '@/shared/api/laravelClient';

/**
 * santeApi.ts — Console de santé du système (mibeko-dashboard#110).
 *
 * Le pipeline d'ingestion, la veille push, la file de mail et le parc mobile
 * échouent chacun dans leur coin sans témoin commun : cet endpoint agrège les
 * quatre, plus la santé du corpus, sur un seul écran.
 */

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface SanteExtractionEchec {
  id: string;
  document_id: string;
  document_titre: string | null;
  document_slug: string | null;
  motif: string | null;
  finished_at: string | null;
}

/** Une ligne de `mibeko:surveiller-file-mail` : soit un échec daté, soit un blocage chiffré en minutes. */
export interface SanteMailIncident {
  classe: string;
  quand?: string;
  minutes?: number;
}

export interface SanteParcMobileVersion {
  version: string;
  total: number;
}

export interface AdminSante {
  extractions: { total_echecs: number; echecs: SanteExtractionEchec[] };
  veille: { dispatches_delivres: number; dispatches_en_echec: number; appareils_joignables: number };
  mail: { echecs: SanteMailIncident[]; bloques: SanteMailIncident[]; total_echecs: number; total_bloques: number };
  parc_mobile: { total_actifs: number; versions: SanteParcMobileVersion[]; version_inconnue: number };
  corpus: {
    published: number;
    pending: number;
    signales: number;
    versions_without_embedding: number;
    retard_publication: { seuil_jours: number; documents: number };
  };
}

export const getAdminSante = (): Promise<AdminSante> =>
  laravelClient.get<Envelope<AdminSante>>('admin/sante').then((r) => r.data.data);

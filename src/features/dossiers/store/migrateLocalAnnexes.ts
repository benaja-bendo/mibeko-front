/**
 * migrateLocalAnnexes.ts — Migration douce localStorage → API des annexes.
 *
 * Les annexes vivaient auparavant dans un store zustand persisté sous la clé
 * `mibeko_dossier_annexes` (forme `{ state: { byId } }`). Après le passage à
 * l'API, on remonte une seule fois ces données locales résiduelles vers le
 * serveur — pour chaque dossier réellement possédé par l'utilisateur (présent
 * dans la liste chargée) — puis on purge la clé. Les utilisateurs actuels ne
 * perdent donc pas leurs annexes.
 *
 * Best-effort et non bloquant : la remontée se fait ITEM PAR ITEM et seuls les
 * items en échec sont conservés pour une prochaine tentative. Les pièces et les
 * documents n'étant PAS idempotents (chaque POST crée une ligne), il ne faut
 * jamais rejouer un item déjà remonté — sinon on le dupliquerait. Les références
 * sont idempotentes côté serveur (dédup par UUID cible), donc sûres à rejouer.
 */

import {
  addDocument,
  addPiece,
  addReference,
} from '@/features/dossiers/api/dossiersApi';
import type {
  GeneratedDocument,
  LegalReference,
  Piece,
} from '@/features/dossiers/types';

const LEGACY_KEY = 'mibeko_dossier_annexes';

interface LegacyAnnex {
  references?: LegalReference[];
  pieces?: Piece[];
  documents?: GeneratedDocument[];
}

/** Lit prudemment le store persisté legacy. Renvoie `{}` si absent/corrompu. */
function readLegacy(): Record<string, LegacyAnnex> {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { state?: { byId?: unknown } };
    const byId = parsed?.state?.byId;
    if (!byId || typeof byId !== 'object') return {};
    return byId as Record<string, LegacyAnnex>;
  } catch {
    return {};
  }
}

/** Réécrit le store legacy sans les dossiers déjà migrés (ou purge la clé). */
function writeLegacyRemainder(remainder: Record<string, LegacyAnnex>): void {
  try {
    if (Object.keys(remainder).length === 0) {
      localStorage.removeItem(LEGACY_KEY);
    } else {
      localStorage.setItem(
        LEGACY_KEY,
        JSON.stringify({ state: { byId: remainder }, version: 0 }),
      );
    }
  } catch {
    /* stockage indisponible : rien à faire */
  }
}

let migrationRan = false;

/**
 * Remonte vers l'API les annexes locales des dossiers fournis, puis purge le
 * localStorage. Idempotent au sein d'une session (ne s'exécute qu'une fois) et
 * silencieux en l'absence de données legacy.
 *
 * @param ownedDossierIds Identifiants des dossiers possédés (liste chargée).
 * @param onDone Callback appelé si au moins un dossier a été migré (ex. pour
 *   rafraîchir la liste).
 */
export async function migrateLocalAnnexes(
  ownedDossierIds: string[],
  onDone?: () => void,
): Promise<void> {
  if (migrationRan) return;
  const legacy = readLegacy();
  if (Object.keys(legacy).length === 0) {
    migrationRan = true;
    return;
  }
  migrationRan = true;

  const owned = new Set(ownedDossierIds);
  const remainder: Record<string, LegacyAnnex> = {};
  let migratedAny = false;

  for (const [dossierId, annex] of Object.entries(legacy)) {
    // On ne remonte que les dossiers réellement possédés (scoping serveur) ;
    // les autres restent en attente (dossier peut-être pas encore chargé).
    if (!owned.has(dossierId)) {
      remainder[dossierId] = annex;
      continue;
    }

    // Remontée item par item : on ne conserve QUE les items en échec, pour ne
    // jamais rejouer (et donc dupliquer) une pièce/un document déjà créé.
    const failedRefs: LegalReference[] = [];
    const failedPieces: Piece[] = [];
    const failedDocs: GeneratedDocument[] = [];

    for (const ref of annex.references ?? []) {
      try {
        await addReference(dossierId, {
          id: ref.id,
          type: ref.type,
          title: ref.title,
          breadcrumb: ref.breadcrumb,
          number: ref.number ?? null,
          note: ref.note,
        });
        migratedAny = true;
      } catch {
        failedRefs.push(ref);
      }
    }
    for (const piece of annex.pieces ?? []) {
      try {
        await addPiece(dossierId, {
          name: piece.name,
          size: piece.size,
          mime: piece.mime,
          note: piece.note,
        });
        migratedAny = true;
      } catch {
        failedPieces.push(piece);
      }
    }
    for (const doc of annex.documents ?? []) {
      try {
        await addDocument(dossierId, {
          templateId: doc.templateId,
          templateName: doc.templateName,
          title: doc.title,
          html: doc.html,
        });
        migratedAny = true;
      } catch {
        failedDocs.push(doc);
      }
    }

    if (failedRefs.length || failedPieces.length || failedDocs.length) {
      remainder[dossierId] = {
        references: failedRefs,
        pieces: failedPieces,
        documents: failedDocs,
      };
    }
  }

  writeLegacyRemainder(remainder);
  if (migratedAny) onDone?.();
}

/** Réinitialise le verrou de session (tests uniquement). */
export function __resetAnnexMigrationForTests(): void {
  migrationRan = false;
}

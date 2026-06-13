/**
 * sourceMentions.ts — Repérage des mentions de sources citées dans la prose.
 *
 * À partir des `sources` d'une réponse de l'IA (déjà présentes côté client),
 * construit de quoi détecter, dans le texte, les renvois qui pointent vers une
 * source citée — sans aucune requête réseau :
 *  - les TITRES de documents cités (ex. « Code du travail ») ;
 *  - les renvois « article N » dont le numéro identifie UNE seule source
 *    (les numéros ambigus, partagés par plusieurs documents, sont ignorés pour
 *    ne jamais pointer vers la mauvaise source).
 *
 * Chaque mention détectée porte l'index 1-based de sa source, aligné avec les
 * marqueurs de citation [n] : l'aperçu au survol et l'ouverture réutilisent
 * exactement le même mécanisme.
 */

import type { AssistantSource } from '@/features/assistant/types';

/** Une mention détectée dans un fragment de texte. */
export interface MentionMatch {
  /** Index 1-based de la source (aligné avec les marqueurs [n]). */
  index: number;
  source: AssistantSource;
  /** Bornes de la mention dans le fragment analysé. */
  start: number;
  end: number;
  /** Texte exact repéré (conservé tel quel pour l'affichage). */
  text: string;
}

/** Détecteur de mentions construit pour une liste de sources donnée. */
export interface MentionMatcher {
  findMatches: (text: string) => MentionMatch[];
}

/** En-dessous de cette longueur, un titre est trop court pour être repéré sûrement. */
const MIN_TITLE_LENGTH = 5;

/** Échappe les métacaractères pour une insertion littérale dans une RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Construit un détecteur de mentions pour les sources d'une réponse, ou `null`
 * s'il n'y a rien d'exploitable (aucune source).
 */
export function buildMentionMatcher(
  sources: AssistantSource[] | undefined,
): MentionMatcher | null {
  if (!sources || sources.length === 0) return null;

  // Titre (minuscule) -> index 1-based de la PREMIÈRE source portant ce titre.
  const titleToIndex = new Map<string, number>();
  // Numéro d'article -> nombre d'occurrences (pour écarter les numéros ambigus).
  const numberOccurrences = new Map<string, number>();
  // Numéro d'article -> index 1-based de la première source portant ce numéro.
  const numberToIndex = new Map<string, number>();

  sources.forEach((source, i) => {
    const index = i + 1;

    const title = source.document_title?.trim();
    if (title && title.length >= MIN_TITLE_LENGTH) {
      const key = title.toLowerCase();
      if (!titleToIndex.has(key)) titleToIndex.set(key, index);
    }

    const number = source.number?.toString().trim();
    if (number) {
      numberOccurrences.set(number, (numberOccurrences.get(number) ?? 0) + 1);
      if (!numberToIndex.has(number)) numberToIndex.set(number, index);
    }
  });

  // Les titres les plus longs d'abord : un titre précis prime sur un préfixe.
  const titles = [...titleToIndex.keys()].sort((a, b) => b.length - a.length);

  const alternatives: string[] = [];
  if (titles.length > 0) {
    alternatives.push(titles.map(escapeRegExp).join('|'));
  }
  // « article 42 », « art. 42 », « art 42 », « article L.1234-5 bis »…
  alternatives.push(
    String.raw`(?:articles?|art\.?)\s+([LRD]?\.?\s?\d+(?:[-.]\d+)*(?:\s?(?:bis|ter|quater))?)`,
  );

  const regex = new RegExp(`(${alternatives.join('|')})`, 'gi');

  return {
    findMatches(text: string): MentionMatch[] {
      const matches: MentionMatch[] = [];
      regex.lastIndex = 0;

      let result: RegExpExecArray | null;
      while ((result = regex.exec(text)) !== null) {
        const whole = result[0];

        // 1) Mention par titre de document (sans ambiguïté).
        let index = titleToIndex.get(whole.toLowerCase());

        // 2) Sinon, renvoi « article N » : on relie au numéro s'il est unique.
        if (index === undefined) {
          const numberMatch = whole.match(/(\d+(?:[-.]\d+)*)/);
          const number = numberMatch?.[1];
          if (number && (numberOccurrences.get(number) ?? 0) === 1) {
            index = numberToIndex.get(number);
          }
        }

        if (index !== undefined) {
          matches.push({
            index,
            source: sources[index - 1],
            start: result.index,
            end: result.index + whole.length,
            text: whole,
          });
        }

        // Garde-fou contre une éventuelle correspondance vide.
        if (result.index === regex.lastIndex) regex.lastIndex++;
      }

      return matches;
    },
  };
}

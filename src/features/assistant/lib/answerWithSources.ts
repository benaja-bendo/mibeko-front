import type { ChatMessage } from '../types';
import { displayArticleNumber } from '@/shared/lib/legalLabels';

/** Conserve les références citées avec le texte copié dans une note de travail. */
export function answerWithSources(message: ChatMessage, origin: string): string {
  const cited = new Set([...message.content.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])));
  const references = (message.sources ?? []).flatMap((source, position) => {
    if (!cited.has(position + 1)) return [];
    const label = [source.document_title, source.number ? `Article ${displayArticleNumber(source.number)}` : null]
      .filter(Boolean).join(' — ') || 'Source Mibeko';
    const params = new URLSearchParams();
    if (source.document_id) params.set('doc', source.document_id);
    if (source.id) params.set('article', source.id);
    const link = source.document_id ? `\n${origin}/app/library?${params}` : '';
    return [`[${position + 1}] ${label}${link}`];
  });
  return references.length ? `${message.content}\n\nRéférences\n${references.join('\n\n')}` : message.content;
}

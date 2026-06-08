/**
 * LibraryAiAnswer.tsx — Carte de synthèse IA (RAG) en tête des résultats.
 *
 * Réutilise le rendu Markdown de la feature Assistant pour une présentation
 * cohérente. La synthèse s'appuie sur les sources listées en dessous.
 */

import { Sparkles, MessageSquarePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MarkdownLite from '@/features/assistant/components/MarkdownLite';

interface LibraryAiAnswerProps {
  answer: string;
  sourceCount: number;
  /** Requête d'origine, pour rebondir vers l'Assistant. */
  query: string;
}

export default function LibraryAiAnswer({
  answer,
  sourceCount,
  query,
}: LibraryAiAnswerProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gold/15">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
          </span>
          <span className="text-xs font-semibold text-t1">Synthèse Mibeko IA</span>
        </div>
        <span className="font-mono text-[10px] text-t3">
          {sourceCount} source{sourceCount > 1 ? 's' : ''}
        </span>
      </div>

      <MarkdownLite content={answer} />

      <div className="mt-3 flex items-center justify-between border-t border-b1 pt-3">
        <p className="text-[10px] text-t4">
          Vérifiez les références dans les textes officiels ci-dessous.
        </p>
        <button
          type="button"
          onClick={() =>
            navigate(`/app/assistant?q=${encodeURIComponent(query)}`)
          }
          className="flex items-center gap-1.5 rounded-lg border border-b1 bg-s1 px-2.5 py-1.5 text-[11px] font-medium text-t2 transition-colors hover:bg-s2 hover:text-t1"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Approfondir avec l'Assistant
        </button>
      </div>
    </div>
  );
}

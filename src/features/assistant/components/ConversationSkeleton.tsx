/**
 * ConversationSkeleton.tsx — État de chargement d'une conversation.
 *
 * Reprend la silhouette réelle du fil (bulle utilisateur à droite, réponse
 * pleine largeur avec avatar à gauche) pour que la transition vers les vrais
 * messages soit visuellement continue, plutôt qu'un spinner générique.
 */

interface ConversationSkeletonProps {
  /** Nombre d'échanges (question + réponse) esquissés. */
  exchanges?: number;
}

export default function ConversationSkeleton({
  exchanges = 2,
}: ConversationSkeletonProps) {
  return (
    <div
      data-testid="conversation-skeleton"
      aria-label="Chargement de la conversation"
      className="mx-auto max-w-3xl animate-pulse space-y-6 px-4 py-6"
    >
      {[...Array(exchanges)].map((_, i) => (
        <div key={i} className="space-y-6">
          {/* Bulle utilisateur (droite) */}
          <div className="flex justify-end gap-3">
            <div
              className="h-10 rounded-2xl rounded-tr-sm bg-s2"
              style={{ width: `${44 - (i % 2) * 12}%` }}
            />
            <div className="h-7 w-7 shrink-0 rounded-full bg-s3" />
          </div>

          {/* Réponse assistant (gauche, pleine largeur) */}
          <div className="flex gap-3">
            <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-s2" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <div className="h-3.5 w-[92%] rounded bg-s2" />
              <div className="h-3.5 w-[78%] rounded bg-s2" />
              <div className="h-3.5 w-[85%] rounded bg-s2" />
              {/* Esquisse des cartes de sources */}
              <div className="flex gap-2.5 pt-2">
                <div className="h-20 w-[260px] shrink-0 rounded-xl bg-s2" />
                <div className="h-20 w-[180px] shrink-0 rounded-xl bg-s2" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

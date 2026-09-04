/**
 * AssistantHomeView.tsx — Accueil de l'Assistant (état « avant premier message »).
 *
 * Même esprit que l'accueil vivant de la Bibliothèque : au lieu d'un simple
 * écran vide, la page se présente et montre immédiatement sa valeur pour un
 * professionnel du droit :
 *  - identité de l'outil (ce que l'IA interroge, en une phrase) ;
 *  - les trois promesses de l'outil (réponses courtes, sources cliquables,
 *    recherche ciblée par texte) qui doublent de mode d'emploi ;
 *  - questions d'exemple cliquables pour démarrer en un geste.
 *
 * Le fonds documentaire chiffré (textes/articles/institutions) ne vit plus
 * ici : il était répété à l'identique sur cette page et sur l'accueil de la
 * Bibliothèque, sans jamais faire l'objet d'un endroit canonique — déplacé
 * sur le Tableau de bord (Dashboard.tsx), sa place naturelle de vue
 * d'ensemble. Décision du 04/09/2026.
 */

import { AtSign, Layers, Link2, Search, Sparkles, Zap } from 'lucide-react';

interface AssistantHomeViewProps {
  /** Lance une question (suggestion cliquée). */
  onAsk: (question: string) => void;
  suggestions: string[];
}

const CAPABILITIES = [
  {
    icon: Zap,
    title: 'Réponses directes',
    description:
      'Par défaut, l\'IA répond en quelques phrases. Besoin des fondements et exceptions ? Passez en mode Analyse.',
  },
  {
    icon: Link2,
    title: 'Chaque affirmation sourcée',
    description:
      'Les marqueurs [n] et les cartes sous la réponse ouvrent l\'article exact dans la Bibliothèque — vérifiable en un clic.',
  },
  {
    icon: AtSign,
    title: 'Recherche ciblée',
    description:
      'Tapez @ pour épingler un code ou une loi : la réponse se limite à ce texte, sans bruit des autres sources.',
  },
] as const;

export default function AssistantHomeView({
  onAsk,
  suggestions,
}: AssistantHomeViewProps) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
      {/* En-tête : identité de l'outil */}
      <div className="rounded-2xl border border-gold/15 bg-gold/[0.05] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10">
            <Sparkles className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-t1">
              Mibeko IA — votre recherche juridique, sourcée
            </h2>
            <p className="text-xs text-t3">
              Réponses fondées exclusivement sur les textes officiels du droit
              congolais et de l'espace OHADA.
            </p>
          </div>
        </div>
      </div>

      {/* Les trois promesses de l'outil (et leur mode d'emploi) */}
      <div className="grid gap-2 sm:grid-cols-3">
        {CAPABILITIES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-xl border border-b1 bg-s1 p-3"
          >
            <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg border border-gold/20 bg-gold/10">
              <Icon className="h-3.5 w-3.5 text-gold" />
            </div>
            <p className="text-xs font-semibold text-t1">{title}</p>
            <p className="mt-1 text-[11px] leading-snug text-t3">
              {description}
            </p>
          </div>
        ))}
      </div>

      {/* Démarrer en un clic */}
      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 px-1 font-mono text-[10px] uppercase tracking-widest text-t4">
          <Search className="h-3 w-3" />
          Posez votre première question
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onAsk(suggestion)}
              className="rounded-xl border border-b1 bg-s1 p-3 text-left text-xs leading-relaxed text-t2 transition-colors hover:border-gold/30 hover:bg-s2 hover:text-t1"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-1.5 px-1 text-[10px] text-t4">
          <Layers className="h-3 w-3" />
          Astuce : le mode « Analyse » du champ de saisie structure la réponse
          (fondements, exceptions, points de vigilance).
        </p>
      </section>
    </div>
  );
}

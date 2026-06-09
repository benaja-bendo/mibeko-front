import type { ReactNode } from 'react';

interface SettingsCardProps {
  title: string;
  description?: string;
  /** Action alignée à droite de l'en-tête (ex: bouton, badge). */
  action?: ReactNode;
  children: ReactNode;
  /** Pied de carte (généralement les boutons de validation). */
  footer?: ReactNode;
}

/**
 * Carte de section homogène pour les écrans Paramètres.
 *
 * Reprend les tokens du design system (s1/b1/t1-t3) et structure en-tête /
 * contenu / pied pour garder une mise en page cohérente entre toutes les pages.
 */
export function SettingsCard({ title, description, action, children, footer }: SettingsCardProps) {
  return (
    <section className="bg-s1 border border-b1 rounded-xl overflow-hidden">
      <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-b1">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-t1">{title}</h2>
          {description && <p className="text-xs text-t3 mt-1 leading-relaxed">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="px-5 py-5 space-y-4">{children}</div>
      {footer && (
        <footer className="flex items-center justify-end gap-3 px-5 py-3 border-t border-b1 bg-s1/50">
          {footer}
        </footer>
      )}
    </section>
  );
}

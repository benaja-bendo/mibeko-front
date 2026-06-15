import { useThemes } from '@/features/library/hooks/useThemes';
import { themeIcon } from '@/features/library/components/themeIcon';
import { formatCompactNumber } from '@/shared/lib/formatNumber';

/**
 * Bande « Parcourir par thème » de l'accueil Bibliothèque : permet de trouver
 * le droit par situation de vie plutôt que par référence. Un clic applique le
 * filtre de thème (et lance donc la recherche correspondante).
 */
export default function ThemeBrowseStrip({ onSelect }: { onSelect: (slug: string) => void }) {
  const { data: themes } = useThemes();

  if (!themes || themes.length === 0) return null;

  return (
    <section className="mb-5">
      <h2 className="text-t4 text-[10px] font-mono uppercase tracking-widest mb-2.5">Parcourir par thème</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onSelect(theme.slug)}
            className="flex items-center gap-2.5 rounded-xl border border-b1 bg-s1 hover:bg-s2 hover:border-gold/30 px-3 py-2.5 text-left transition-colors group"
          >
            <span className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
              {themeIcon(theme.icon, 'w-4 h-4')}
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] text-t1 font-medium truncate">{theme.name}</span>
              <span className="block text-[10.5px] text-t4">
                {formatCompactNumber(theme.documents_count)} texte{theme.documents_count > 1 ? 's' : ''}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

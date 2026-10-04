import { cn } from '@/shared/lib/utils';
import logo32 from '@/assets/logo/mibeko-32.webp?no-inline';
import logo48 from '@/assets/logo/mibeko-48.webp?no-inline';
import logo56 from '@/assets/logo/mibeko-56.webp?no-inline';
import logo64 from '@/assets/logo/mibeko-64.webp?no-inline';
import logo84 from '@/assets/logo/mibeko-84.webp?no-inline';
import logo96 from '@/assets/logo/mibeko-96.webp?no-inline';
import logo144 from '@/assets/logo/mibeko-144.webp?no-inline';

// L'écu actuel, rendu par Chrome puis enregistré en WebP sans perte aux tailles
// où on l'affiche : 28, 32 et 48 px, en 1x, 2x et 3x. Le SVG d'origine pesait
// 610 ko : c'est un décalque automatique de 1 715 tracés, qu'aucune
// simplification ne rend léger sans ouvrir des fentes dans le dessin
// (mibeko-front#73). Le navigateur ne télécharge que l'image qui correspond à
// `size` et à la densité de l'écran. `?no-inline` empêche Vite de glisser les
// plus petites dans le JavaScript, où tous les écrans les paieraient.
// Quand l'écu redessiné de D-055 sera validé (mibeko-site#5), un SVG de
// quelques ko remplacera ces fichiers.
const SRC_SET = [
  `${logo32} 32w`,
  `${logo48} 48w`,
  `${logo56} 56w`,
  `${logo64} 64w`,
  `${logo84} 84w`,
  `${logo96} 96w`,
  `${logo144} 144w`,
].join(', ');

interface MibekoLogoProps {
  /** Côté du carré qui accueille le logo, en pixels CSS. */
  size: number;
  /** Vide quand le nom « Mibeko » est écrit juste à côté (logo décoratif). */
  alt?: string;
  className?: string;
}

export function MibekoLogo({ size, alt = 'Mibeko Logo', className }: MibekoLogoProps) {
  // `lazy` : la Sidebar rend deux logos (en-tête de bureau, barre du téléphone)
  // dont l'un est masqué par CSS. Une image différée et masquée n'est jamais
  // téléchargée ; sans cela, l'écran dense chargerait deux tailles.
  return (
    <img
      src={logo96}
      srcSet={SRC_SET}
      sizes={`${size}px`}
      width={size}
      height={size}
      loading="lazy"
      alt={alt}
      className={cn('w-full h-full object-contain', className)}
    />
  );
}

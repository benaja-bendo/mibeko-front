import type { ReactNode } from 'react';
import {
  Users, Briefcase, Home, Gavel, Shield, Building2, Receipt, HeartPulse, Landmark, Leaf, Tag,
} from 'lucide-react';

/**
 * Icône lucide d'un thème de vie à partir de son nom d'icône (champ `icon` du
 * thème, défini par le seeder/admin). Fallback générique « Tag ».
 */
export function themeIcon(icon?: string | null, className = 'w-4 h-4'): ReactNode {
  switch (icon) {
    case 'users':
      return <Users className={className} />;
    case 'briefcase':
      return <Briefcase className={className} />;
    case 'home':
      return <Home className={className} />;
    case 'gavel':
      return <Gavel className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'building-2':
      return <Building2 className={className} />;
    case 'receipt':
      return <Receipt className={className} />;
    case 'heart-pulse':
      return <HeartPulse className={className} />;
    case 'landmark':
      return <Landmark className={className} />;
    case 'leaf':
      return <Leaf className={className} />;
    default:
      return <Tag className={className} />;
  }
}

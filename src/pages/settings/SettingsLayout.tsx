import { NavLink } from 'react-router-dom';
import { User, Bell, CreditCard, LifeBuoy } from 'lucide-react';
import type { ReactNode } from 'react';
import AppLayout from '@/widgets/layout/AppLayout';
import { useAuthStore } from '@/features/auth/store/authStore';
import { isEditorOrAbove } from '@/shared/types/auth';
import { cn } from '@/shared/lib/utils';

const SETTINGS_NAV = [
  { to: '/settings/account', label: 'Compte', icon: User },
  { to: '/settings/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings/billing', label: 'Facturation', icon: CreditCard },
  { to: '/settings/support', label: 'Support & Légal', icon: LifeBuoy },
];

interface SettingsLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Cadre commun des pages Paramètres : en-tête, sous-navigation verticale (desktop)
 * / horizontale (mobile) et zone de contenu.
 *
 * L'espace de la sidebar principale est déduit du rôle pour rester cohérent avec
 * l'environnement de travail de l'utilisateur (éditeur vs pro).
 */
export default function SettingsLayout({ title, description, children }: SettingsLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const space = isEditorOrAbove(user) ? 'editor' : 'app';

  return (
    <AppLayout space={space}>
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
          {/* En-tête */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-t1">Paramètres</h1>
            <p className="text-sm text-t3 mt-1">
              Gérez votre compte, vos préférences et la sécurité de votre espace Mibeko.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Sous-navigation */}
            <nav
              aria-label="Sections des paramètres"
              className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-56 shrink-0 -mx-1 px-1 md:mx-0 md:px-0"
            >
              {SETTINGS_NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors border',
                      isActive
                        ? 'bg-gold/10 text-gold border-gold/15 font-medium'
                        : 'text-t2 hover:bg-s2 hover:text-t1 border-transparent',
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Contenu de la section */}
            <div className="flex-1 min-w-0 space-y-6">
              <div>
                <h2 className="text-lg font-display font-semibold text-t1">{title}</h2>
                {description && <p className="text-sm text-t3 mt-0.5">{description}</p>}
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

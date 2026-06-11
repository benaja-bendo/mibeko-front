import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { logout } from '@/features/auth/api/authApi';
import logoMibeko from '@/assets/logo_mibeko.svg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/shared/components/ui/Sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Settings, CreditCard, Bell, Sparkles, LogOut, ChevronUp, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Nav definitions
// ---------------------------------------------------------------------------
const EDITOR_NAV = [
  {
    to: '/editor',
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    label: 'Dashboard',
  },
  {
    to: '/editor/documents',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8M8 11h5" />
      </svg>
    ),
    label: 'Documents',
  },
  {
    to: '/editor/ingestion',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    label: 'Ingestion',
  },
  {
    to: '/editor/settings',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    label: 'Paramètres',
  },
];

const APP_NAV = [
  {
    to: '/app',
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    label: 'Tableau de bord',
  },
  {
    to: '/app/library',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    label: 'Bibliothèque',
  },
  {
    to: '/app/assistant',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    label: 'Assistant IA',
  },
  {
    to: '/app/dossiers',
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
    label: 'Dossiers',
  },
];

const ADMIN_NAV = [
  {
    to: '/admin',
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[1.5]">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    label: 'Administration',
  },
];

// ---------------------------------------------------------------------------
// Space switcher tabs
// ---------------------------------------------------------------------------
type Space = 'editor' | 'app' | 'admin';

interface SpaceTab {
  space: Space;
  to: string;
  label: string;
  adminOnly?: boolean;
}

const SPACE_TABS: SpaceTab[] = [
  { space: 'admin', to: '/admin', label: 'Admin', adminOnly: true },
  { space: 'editor', to: '/editor', label: 'Éditeur' },
  { space: 'app', to: '/app', label: 'Pro' },
];

interface SidebarProps {
  space: Space;
}

export default function Sidebar({ space }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Confirmation avant déconnexion (évite les clics accidentels).
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Fermer le menu mobile lors d'un changement de route
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isAdmin = user?.roles?.includes('admin') ?? false;
  const isEditorOrAbove = isAdmin || (user?.roles?.includes('editor') ?? false);

  const navItems = space === 'app' ? APP_NAV : space === 'admin' ? ADMIN_NAV : EDITOR_NAV;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      clearAuth();
      navigate('/auth/login', { replace: true });
    }
  }

  // Tabs visible selon le rôle
  const visibleTabs = SPACE_TABS.filter((t) => {
    if (t.adminOnly) return isAdmin;
    return isEditorOrAbove;
  });

  const SidebarContent = (
    <div className="flex flex-col h-full bg-s1 select-none w-[240px]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-b1 shrink-0">
        <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
          <img src={logoMibeko} alt="Mibeko Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="text-t1 font-display text-sm font-semibold leading-none">Mibeko</div>
          <div className="text-t3 font-mono text-[10px] mt-0.5 capitalize">{space}</div>
        </div>
      </div>

      {/* Space switcher — editor/admin uniquement, affiche leurs espaces disponibles */}
      {isEditorOrAbove && visibleTabs.length > 1 && (
        <div className="flex gap-1 px-3 py-2 border-b border-b1 shrink-0">
          {visibleTabs.map((tab) => {
            const isActive = location.pathname.startsWith(`/${tab.space === 'app' ? 'app' : tab.space}`);
            return (
              <NavLink
                key={tab.space}
                to={tab.to}
                className={() =>
                  `flex-1 text-center text-[10px] font-mono uppercase tracking-wide rounded px-1.5 py-1 transition-colors ${
                    isActive
                      ? 'bg-gold/10 text-gold border border-gold/20'
                      : 'text-t3 hover:text-t2 border border-transparent'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      )}

      {/* Nav items */}
      <nav className="flex flex-col flex-1 py-3 space-y-0.5 overflow-y-auto items-stretch">
        <div className="text-[10px] font-mono uppercase tracking-widest text-t4 px-4 mb-2">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={[
                'flex items-center justify-start gap-3 rounded-md text-[14px] font-body transition-all duration-150 group',
                'mx-2 px-3 py-2',
                isActive
                  ? 'bg-gold/10 text-gold border border-gold/15 font-medium'
                  : 'text-t2 hover:bg-s2 hover:text-t1 border border-transparent',
              ].join(' ')}
            >
              <span className={isActive ? 'text-gold' : 'text-t3 group-hover:text-t2'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User + Logout Dropdown Menu */}
      {user && (
        <div className="mt-auto p-2 border-t border-b1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-s2 transition-colors outline-none focus:ring-2 focus:ring-gold/50">
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-semibold uppercase shrink-0">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="text-t1 text-sm font-medium truncate w-full text-left">{user.name}</span>
                  <span className="text-t3 text-xs font-mono truncate w-full text-left">{user.email}</span>
                </div>
                <ChevronUp className="w-4 h-4 text-t3 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-[224px] mb-1">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-t1">{user.name}</p>
                  <p className="text-xs leading-none text-t3 font-mono">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem className="gap-2" onClick={() => navigate('/app/upgrade')}>
                  <Sparkles className="w-4 h-4 text-gold" />
                  <span className="text-gold font-medium">Passer à la version Pro</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem className="gap-2" onClick={() => navigate('/settings/account')}>
                  <Settings className="w-4 h-4" />
                  <span>Compte</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => navigate('/settings/billing')}>
                  <CreditCard className="w-4 h-4" />
                  <span>Facturation</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => navigate('/settings/notifications')}>
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setLogoutConfirmOpen(true)}
                className="gap-2 text-red-400 focus:text-red-500 focus:bg-red-400/10"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-s1 border-b border-b1 z-40 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 flex items-center justify-center overflow-hidden">
            <img src={logoMibeko} alt="Mibeko Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-t1 font-display text-sm font-semibold leading-none">Mibeko</div>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="p-2 -mr-2 text-t2 hover:text-t1 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[240px] border-r border-b1">
            <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
            <SheetDescription className="sr-only">Liens de navigation et profil utilisateur</SheetDescription>
            {SidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:relative md:w-[240px] md:shrink-0 md:flex-col md:h-full md:border-r border-b1 z-50">
        {SidebarContent}
      </aside>

      {/* Confirmation de déconnexion — rendue une seule fois (le contenu de
          la sidebar, lui, est monté deux fois : desktop + Sheet mobile). */}
      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Se déconnecter&nbsp;?</DialogTitle>
            <DialogDescription>
              Votre session sur cet appareil sera fermée. Vous pourrez vous
              reconnecter à tout moment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={loggingOut}
              onClick={() => setLogoutConfirmOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={loggingOut}
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

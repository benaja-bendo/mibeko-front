import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { logout } from '@/features/auth/api/authApi';
import logoMibeko from '@/assets/logo_mibeko.svg';

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
  { space: 'app', to: '/app/library', label: 'Pro' },
];

interface SidebarProps {
  space: Space;
}

export default function Sidebar({ space }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const isAdmin = user?.roles?.includes('admin') ?? false;
  const isEditorOrAbove = isAdmin || (user?.roles?.includes('editor') ?? false);

  const navItems = space === 'app' ? APP_NAV : space === 'admin' ? ADMIN_NAV : EDITOR_NAV;

  async function handleLogout() {
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

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 flex h-16 bg-s1 border-t border-b1 select-none md:relative md:w-[200px] md:shrink-0 md:flex-col md:h-full md:border-t-0 md:border-r">
      {/* Logo */}
      <div className="hidden md:flex items-center gap-2.5 px-4 py-4 border-b border-b1">
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
        <div className="hidden md:flex gap-1 px-3 py-2 border-b border-b1">
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
      <nav className="flex flex-1 flex-row items-center justify-around px-2 md:flex-col md:justify-start md:py-3 md:space-y-0.5 md:overflow-y-auto md:items-stretch">
        <div className="hidden md:block text-[10px] font-mono uppercase tracking-widest text-t4 px-2 mb-2">
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
                'flex items-center justify-center md:justify-start gap-2.5 rounded-md text-[13px] font-body transition-all duration-150 group',
                'p-2.5 md:px-2.5 md:py-2',
                isActive
                  ? 'bg-gold/10 text-gold border border-gold/15'
                  : 'text-t2 hover:bg-s2 hover:text-t1 border border-transparent',
              ].join(' ')}
            >
              <span className={isActive ? 'text-gold' : 'text-t3 group-hover:text-t2'}>
                {item.icon}
              </span>
              <span className="hidden md:inline">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User + Logout */}
      {user && (
        <div className="hidden md:flex flex-col gap-1 px-3 py-3 border-t border-b1">
          <div className="text-t2 text-xs truncate font-medium">{user.name}</div>
          <div className="text-t4 text-[10px] font-mono truncate">{user.email}</div>
          <button
            onClick={handleLogout}
            className="mt-1 text-left text-[11px] text-t3 hover:text-red-400 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      )}
    </aside>
  );
}

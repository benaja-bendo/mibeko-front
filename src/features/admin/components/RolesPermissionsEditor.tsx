import React from 'react';
import { ROLE_OPTIONS, PERMISSION_CATALOG } from '@/features/admin/api/usersApi';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Éditeur de rôles (cases) + override de permissions directes (repliable).
 * Les permissions héritées des rôles sont affichées en lecture seule ; seules
 * les permissions directes sont éditables ici.
 */
export default function RolesPermissionsEditor({
  roles,
  onRolesChange,
  directPermissions,
  onDirectPermissionsChange,
  inheritedPermissions,
}: {
  roles: string[];
  onRolesChange: (roles: string[]) => void;
  directPermissions: string[];
  onDirectPermissionsChange: (permissions: string[]) => void;
  inheritedPermissions: string[];
}) {
  const [showPermissions, setShowPermissions] = React.useState(false);

  const toggleRole = (value: string) => {
    onRolesChange(roles.includes(value) ? roles.filter((r) => r !== value) : [...roles, value]);
  };

  const togglePermission = (value: string) => {
    onDirectPermissionsChange(
      directPermissions.includes(value)
        ? directPermissions.filter((p) => p !== value)
        : [...directPermissions, value],
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {ROLE_OPTIONS.map((r) => {
          const active = roles.includes(r.value);
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => toggleRole(r.value)}
              className={[
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                active ? 'bg-gold/10 border-gold/30 text-t1' : 'bg-s2 border-b1 text-t3 hover:text-t2',
              ].join(' ')}
            >
              <span
                className={[
                  'w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[9px]',
                  active ? 'bg-gold border-gold text-bg' : 'border-t4',
                ].join(' ')}
              >
                {active ? '✓' : ''}
              </span>
              <span className="text-[12px] font-medium">{r.label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowPermissions((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-t3 hover:text-t2"
      >
        {showPermissions ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Permissions directes (avancé)
      </button>

      {showPermissions && (
        <div className="space-y-3 rounded-lg border border-b1 bg-s2 p-3">
          <p className="text-t4 text-[11px]">
            Une permission cochée est accordée en plus de celles héritées des rôles. Les permissions déjà
            couvertes par un rôle sont marquées « hérité ».
          </p>
          {PERMISSION_CATALOG.map((grp) => (
            <div key={grp.group} className="space-y-1.5">
              <div className="text-t4 text-[10px] font-mono uppercase tracking-widest">{grp.group}</div>
              <div className="flex flex-wrap gap-1.5">
                {grp.permissions.map((perm) => {
                  const direct = directPermissions.includes(perm);
                  const inherited = inheritedPermissions.includes(perm) && !direct;
                  return (
                    <button
                      key={perm}
                      type="button"
                      onClick={() => togglePermission(perm)}
                      className={[
                        'rounded-md border px-2 py-1 text-[10px] font-mono transition-colors',
                        direct
                          ? 'bg-gold/10 border-gold/30 text-gold'
                          : inherited
                            ? 'bg-s1 border-b1 text-t4'
                            : 'bg-s1 border-b1 text-t3 hover:text-t2',
                      ].join(' ')}
                      title={inherited ? 'Hérité d\'un rôle' : undefined}
                    >
                      {perm}
                      {inherited && <span className="ml-1 text-t4">· hérité</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type UserRole = 'admin' | 'editor' | 'user_pro' | 'mobile_user';

export interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  permissions: string[];
}

export interface AuthTokenPayload {
  token: string;
  user: User;
}

// Role hierarchy helpers
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  editor: 3,
  user_pro: 2,
  mobile_user: 1,
};

export function hasRole(user: User | null, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.some((r) => user.roles.includes(r));
}

export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function isEditorOrAbove(user: User | null): boolean {
  return hasRole(user, 'admin', 'editor');
}

export function isProOrAbove(user: User | null): boolean {
  return hasRole(user, 'admin', 'editor', 'user_pro');
}

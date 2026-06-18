import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { authLogic } from '@/logic/authLogic.js';
import { roleService } from '@/services/roleService.js';
import { rbacLogic } from '@/logic/rbacLogic.js';

// AuthContext — holds the current user, the role list, and the RESOLVED
// permission object (rbacLogic). Every guard/menu/button reads from here.
const AuthContext = createContext(null);

export function AuthProviderCtx({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [booting, setBooting] = useState(true);

  const loadRoles = useCallback(async () => {
    const rows = await roleService.list();
    setRoles(rows);
    return rows;
  }, []);

  const boot = useCallback(async () => {
    await loadRoles();
    const res = await authLogic.restore();
    setUser(res.ok && res.data ? res.data.user : null);
    setBooting(false);
  }, [loadRoles]);

  useEffect(() => { boot(); }, [boot]);

  const login = useCallback(async (identifier, password) => {
    const res = await authLogic.login(identifier, password);
    if (res.ok) { setUser(res.data.user); await loadRoles(); }
    return res;
  }, [loadRoles]);

  const logout = useCallback(async () => {
    await authLogic.logout(user);
    setUser(null);
  }, [user]);

  // Re-pull the current user (after self-permission/role changes elsewhere).
  const refreshUser = useCallback(async () => {
    const res = await authLogic.restore();
    setUser(res.ok && res.data ? res.data.user : null);
    await loadRoles();
  }, [loadRoles]);

  const perms = useMemo(() => rbacLogic.resolve(user || {}, roles), [user, roles]);

  const value = useMemo(() => ({
    user, roles, booting, login, logout, refreshUser, loadRoles,
    isAuthenticated: !!user,
    perms,
    can: perms.can,
    has: perms.has,
    canViewModule: perms.canViewModule,
    isSuperuser: perms.isSuperuser,
  }), [user, roles, booting, login, logout, refreshUser, loadRoles, perms]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext) || {
    user: null, roles: [], booting: false, isAuthenticated: false,
    can: () => false, has: () => false, canViewModule: () => false, isSuperuser: false,
    login: async () => ({ ok: false }), logout: async () => {}, refreshUser: async () => {}, loadRoles: async () => [],
    perms: { permissions: new Set(), sourceOf: () => 'none' },
  };
}

export default AuthContext;

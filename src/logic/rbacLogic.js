import { ROLE_HIERARCHY, PERM_SOURCE, MODULE_MAP, permKey } from '@/constants/permissions.js';

// rbacLogic — pure permission resolution. No I/O. Given the full role list, a
// user, and the user's primary/extra roles + overrides, it computes the
// effective permission set and the provenance (inherited / custom / denied) of
// each permission. This is the single source of truth for "can this user X".

// A role record: { code, permissions: string[], inheritsHierarchy?: boolean, all?: boolean }
// A user record: {
//   roleCode, extraRoles?: string[],
//   grants?: string[]  (custom-added perms),
//   denies?: string[]  (explicitly removed perms — win over everything),
// }

function rolesByCode(roles) {
  return Object.fromEntries((roles || []).map((r) => [r.code, r]));
}

// Roles at or below `code` in the linear hierarchy (for auto-inheritance).
function hierarchyChainFrom(code) {
  const idx = ROLE_HIERARCHY.indexOf(code);
  if (idx === -1) return [code]; // standalone role: only itself
  return ROLE_HIERARCHY.slice(idx); // self + everything lower
}

// Collect permissions a single role contributes, honouring hierarchy inheritance.
function permsForRole(role, byCode) {
  if (!role) return [];
  if (role.all) return ['*']; // super admin wildcard
  const set = new Set(role.permissions || []);
  // Higher roles inherit lower-role permissions unless inheritance disabled.
  if (role.inheritsHierarchy !== false) {
    hierarchyChainFrom(role.code).forEach((lowerCode) => {
      if (lowerCode === role.code) return;
      const lower = byCode[lowerCode];
      if (lower?.all) set.add('*');
      (lower?.permissions || []).forEach((p) => set.add(p));
    });
  }
  return [...set];
}

export const rbacLogic = {
  // Returns { has(module,action), can(permString), isSuperuser, permissions:Set,
  //           sourceOf(permString), rolePermissions:Set }
  resolve(user, roles) {
    const byCode = rolesByCode(roles);
    const codes = [user?.roleCode, ...(user?.extraRoles || [])].filter(Boolean);

    const rolePerms = new Set();
    let superuser = false;
    codes.forEach((code) => {
      const list = permsForRole(byCode[code], byCode);
      if (list.includes('*')) superuser = true;
      list.forEach((p) => rolePerms.add(p));
    });

    const grants = new Set(user?.grants || []);
    const denies = new Set(user?.denies || []);

    const effective = new Set(rolePerms);
    grants.forEach((p) => effective.add(p));
    denies.forEach((p) => effective.delete(p));

    const can = (perm) => {
      if (denies.has(perm)) return false;
      if (superuser) return true;
      return effective.has(perm);
    };

    return {
      isSuperuser: superuser,
      permissions: effective,
      rolePermissions: rolePerms,
      can,
      has: (module, action) => can(permKey(module, action)),
      canViewModule: (module) => can(permKey(module, 'view')) || superuser,
      sourceOf: (perm) => {
        if (denies.has(perm)) return PERM_SOURCE.DENIED;
        if (superuser) return PERM_SOURCE.INHERITED;
        if (grants.has(perm)) return PERM_SOURCE.CUSTOM;
        if (rolePerms.has(perm)) return PERM_SOURCE.INHERITED;
        return PERM_SOURCE.NONE;
      },
    };
  },

  // Modules a resolved permission-set may see (for menu building).
  visibleModules(resolved) {
    return Object.values(MODULE_MAP).filter((m) => resolved.canViewModule(m.key));
  },

  hierarchyChainFrom,
  permsForRole: (role, roles) => permsForRole(role, rolesByCode(roles)),
};

export default rbacLogic;

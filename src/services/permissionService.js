import { roleService } from './roleService.js';
import { userService } from './userService.js';

// permissionService — orchestrates role + user permission reads/writes for the
// Permission Manager (role mode and user-override mode).
export const permissionService = {
  listRoles: () => roleService.list(),
  listUsers: () => userService.list(),

  // Role mode: replace a role's permission array.
  async setRolePermissions(roleId, permissions) {
    return roleService.update(roleId, { permissions: [...new Set(permissions)] });
  },

  async addRolePermission(roleId, perm) {
    const role = await roleService.get(roleId);
    const set = new Set(role?.permissions || []);
    set.add(perm);
    return roleService.update(roleId, { permissions: [...set] });
  },

  async removeRolePermission(roleId, perm) {
    const role = await roleService.get(roleId);
    const set = new Set(role?.permissions || []);
    set.delete(perm);
    return roleService.update(roleId, { permissions: [...set] });
  },

  // User mode: custom grants / explicit denies (overrides on top of role).
  async setUserOverrides(userId, { grants, denies }) {
    const patch = {};
    if (grants) patch.grants = [...new Set(grants)];
    if (denies) patch.denies = [...new Set(denies)];
    return userService.update(userId, patch);
  },

  async grantUserPermission(userId, perm) {
    const user = await userService.get(userId);
    const grants = new Set(user?.grants || []);
    const denies = new Set(user?.denies || []);
    grants.add(perm); denies.delete(perm);
    return userService.update(userId, { grants: [...grants], denies: [...denies] });
  },

  async denyUserPermission(userId, perm) {
    const user = await userService.get(userId);
    const grants = new Set(user?.grants || []);
    const denies = new Set(user?.denies || []);
    denies.add(perm); grants.delete(perm);
    return userService.update(userId, { grants: [...grants], denies: [...denies] });
  },

  async clearUserOverride(userId, perm) {
    const user = await userService.get(userId);
    const grants = new Set(user?.grants || []);
    const denies = new Set(user?.denies || []);
    grants.delete(perm); denies.delete(perm);
    return userService.update(userId, { grants: [...grants], denies: [...denies] });
  },
};

export default permissionService;

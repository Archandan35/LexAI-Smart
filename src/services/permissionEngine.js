// PermissionEngine — application-level role mapping for Supabase browser auth.
// Supabase users authenticate via the browser (anon/authenticated roles) and
// NEVER become PostgreSQL roles directly. Instead, the application maps:
//
//   Supabase User → users.roleCode → LexAI Permission Engine → Access Level
//
// Pages, hooks, services, and repositories call this engine to check access
// instead of depending on database roles.

const ROLE_HIERARCHY = {
  admin: { level: 100, label: 'Administrator', can: ['read', 'write', 'delete', 'admin', 'migrate', 'manage_users', 'manage_roles', 'manage_mappings', 'manage_providers', 'view_logs', 'export_data', 'import_data'] },
  manager: { level: 50, label: 'Manager', can: ['read', 'write', 'delete', 'manage_mappings', 'view_logs', 'export_data'] },
  advocate: { level: 30, label: 'Advocate', can: ['read', 'write', 'export_data'] },
  user: { level: 10, label: 'User', can: ['read'] },
  guest: { level: 0, label: 'Guest', can: ['read'] },
};

export const PermissionEngine = {
  getRole(roleCode) {
    return ROLE_HIERARCHY[roleCode] || ROLE_HIERARCHY.guest;
  },

  can(roleCode, permission) {
    const role = this.getRole(roleCode);
    return role.can.includes(permission);
  },

  hasLevel(roleCode, minLevel) {
    const role = this.getRole(roleCode);
    return role.level >= minLevel;
  },

  canRead(roleCode) { return this.can(roleCode, 'read'); },
  canWrite(roleCode) { return this.can(roleCode, 'write'); },
  canDelete(roleCode) { return this.can(roleCode, 'delete'); },
  canAdmin(roleCode) { return this.can(roleCode, 'admin'); },
  canMigrate(roleCode) { return this.can(roleCode, 'migrate'); },
  canManageMappings(roleCode) { return this.can(roleCode, 'manage_mappings'); },
  canManageProviders(roleCode) { return this.can(roleCode, 'manage_providers'); },

  // Database role mapping: Supabase anon/authenticated → LexAI PostgreSQL role
  mapToDatabaseRole(roleCode) {
    const role = this.getRole(roleCode);
    if (role.level >= 100) return 'lexai_admin';
    if (role.level >= 50) return 'lexai_manager';
    return 'lexai_user';
  },

  // Page-level access: control which pages a role can access
  canAccessPage(roleCode, pagePath) {
    const role = this.getRole(roleCode);

    // Admin pages require admin level
    if (pagePath.startsWith('/admin/') || pagePath === '/admin') {
      return role.can.includes('admin');
    }

    // Schema mapping requires manage_mappings
    if (pagePath.includes('schema-mapping')) {
      return role.can.includes('manage_mappings');
    }

    // All other pages require at least read
    return role.can.includes('read');
  },

  // Repository-level access: control CRUD operations
  canAccessRepository(roleCode, operation) {
    switch (operation) {
      case 'list':
      case 'get':
      case 'count':
        return this.canRead(roleCode);
      case 'create':
      case 'update':
        return this.canWrite(roleCode);
      case 'delete':
        return this.canDelete(roleCode);
      default:
        return false;
    }
  },

  ALL_ROLES: ROLE_HIERARCHY,
};

export default PermissionEngine;

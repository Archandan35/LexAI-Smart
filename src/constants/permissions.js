// Central RBAC vocabulary. The ONLY source of truth for actions, modules,
// role templates and the role hierarchy. Services/logic import from here so the
// permission model stays consistent across the whole app.

// ---- The 17 configurable actions every module can expose ----
export const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'bulkDelete', label: 'Bulk Delete' },
  { key: 'export', label: 'Export' },
  { key: 'import', label: 'Import' },
  { key: 'print', label: 'Print' },
  { key: 'download', label: 'Download' },
  { key: 'upload', label: 'Upload' },
  { key: 'approve', label: 'Approve' },
  { key: 'reject', label: 'Reject' },
  { key: 'assign', label: 'Assign' },
  { key: 'share', label: 'Share' },
  { key: 'archive', label: 'Archive' },
  { key: 'restore', label: 'Restore' },
  { key: 'manageSettings', label: 'Manage Settings' },
  { key: 'sync', label: 'Sync' },
  { key: 'secrets', label: 'Secrets' },
  { key: 'test', label: 'Test' },
  { key: 'protect', label: 'Protect' },
  { key: 'settings', label: 'Settings' },
];

export const ACTION_KEYS = ACTIONS.map((a) => a.key);

// ---- Modules guarded by RBAC (route key === module key) ----
// `admin` flags an administration module (shown only to admin-tier roles by default).
export const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', route: '/' },
  { key: 'drafting', label: 'Drafting Studio', icon: 'pen', route: '/drafting' },
  { key: 'citations', label: 'Citation Search', icon: 'search', route: '/citations' },
  { key: 'verify', label: 'Citation Verify', icon: 'shield', route: '/verify' },
  { key: 'research', label: 'Legal Research', icon: 'book', route: '/research' },
  { key: 'analysis', label: 'Case Analysis', icon: 'scan', route: '/analysis' },
  { key: 'strategy', label: 'Strategy Engine', icon: 'target', route: '/strategy' },
  { key: 'crossExamination', label: 'Cross Examination', icon: 'mic', route: '/cross-examination' },
  { key: 'evidence', label: 'Evidence Gap', icon: 'layers', route: '/evidence' },
  { key: 'documents', label: 'Document Review', icon: 'file', route: '/documents' },
  { key: 'timeline', label: 'Timeline Builder', icon: 'clock', route: '/timeline' },
  { key: 'hearingNotes', label: 'Hearing Notes', icon: 'notes', route: '/hearing-notes' },
  { key: 'casevault', label: 'Case Vault', icon: 'vault', route: '/cases' },
  { key: 'causeList', label: 'Cause List', icon: 'calendar', route: '/cause-list' },
  { key: 'caseManage', label: 'Case Manager', icon: 'folder', route: '/case-manage' },
  { key: 'caseTypes', label: 'Case Types', icon: 'folder', route: '/admin/case-types', admin: true },
  { key: 'courtTypes', label: 'Court Types', icon: 'folder', route: '/admin/court-types', admin: true },
  // Administration modules
  { key: 'users', label: 'User Management', icon: 'users', route: '/admin/users', admin: true },
  { key: 'roles', label: 'Role Management', icon: 'badge', route: '/admin/roles', admin: true },
  { key: 'permissions', label: 'Permission Center', icon: 'lock', route: '/admin/permissions', admin: true },
  { key: 'backup', label: 'Backup & Recovery', icon: 'database', route: '/admin/backup', admin: true },
  { key: 'storage', label: 'Storage & Sync', icon: 'database', route: '/admin/storage', admin: true },
  { key: 'env', label: 'Environment Variables', icon: 'gear', route: '/admin/env-api', admin: true },
  { key: 'api', label: 'API Manager', icon: 'bolt', route: '/admin/env-api', admin: true },
  { key: 'audit', label: 'Audit Logs', icon: 'history', route: '/admin/audit', admin: true },
  { key: 'settings', label: 'System Settings', icon: 'gear', route: '/admin/settings', admin: true },
  { key: 'schema', label: 'Schema Manager', icon: 'database', route: '/admin/schema', admin: true },
];

export const MODULE_KEYS = MODULES.map((m) => m.key);
export const MODULE_MAP = Object.fromEntries(MODULES.map((m) => [m.key, m]));

// A permission string is `module.action`, e.g. `cases.delete`.
export function permKey(module, action) {
  return `${module}.${action}`;
}

// ---- Role hierarchy (highest → lowest). Higher roles inherit lower perms. ----
export const ROLE_HIERARCHY = [
  'Admin',
  'senior_advocate',
  'advocate',
  'junior_advocate',
  'clerk',
];

// Permission assignment provenance (used by Permission Manager visual indicators).
export const PERM_SOURCE = {
  INHERITED: 'inherited', // from role / role hierarchy  (green)
  CUSTOM: 'custom',       // explicit user grant          (blue)
  DENIED: 'denied',       // explicit user deny override  (red)
  NONE: 'none',
};

export default { ACTIONS, MODULES, ROLE_HIERARCHY, PERM_SOURCE };

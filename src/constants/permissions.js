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
];

export const MODULE_KEYS = MODULES.map((m) => m.key);
export const MODULE_MAP = Object.fromEntries(MODULES.map((m) => [m.key, m]));

// A permission string is `module.action`, e.g. `cases.delete`.
export function permKey(module, action) {
  return `${module}.${action}`;
}

// ---- Role hierarchy (highest → lowest). Higher roles inherit lower perms. ----
export const ROLE_HIERARCHY = [
  'super_admin',
  'admin',
  'senior_advocate',
  'advocate',
  'junior_advocate',
  'clerk',
];

// Roles outside the linear chain (no auto-inheritance).
export const STANDALONE_ROLES = ['data_entry_operator', 'receptionist'];

// Helper: expand a permission spec into concrete `module.action` keys.
// spec: { [moduleKey]: ['view','create'] | '*' }  ('*' = all actions)
export function expandPermissions(spec) {
  const out = new Set();
  Object.entries(spec || {}).forEach(([mod, actions]) => {
    const list = actions === '*' ? ACTION_KEYS : actions;
    (list || []).forEach((a) => out.add(permKey(mod, a)));
  });
  return [...out];
}

const ALL_FEATURE_MODULES = MODULES.filter((m) => !m.admin).map((m) => m.key);
const VIEW_ALL_FEATURES = Object.fromEntries(ALL_FEATURE_MODULES.map((m) => [m, ['view']]));

// ---- Built-in role templates (used as defaults + "Permission Template" picker) ----
export const ROLE_TEMPLATES = {
  super_admin: {
    code: 'super_admin',
    name: 'Super Admin',
    description: 'Unrestricted access to every module and administration function.',
    // super admin is handled as a wildcard at resolution time; spec kept for display.
    all: true,
    permissions: expandPermissions(Object.fromEntries(MODULE_KEYS.map((m) => [m, '*']))),
  },
  admin: {
    code: 'admin',
    name: 'Admin',
    description: 'Full operational access plus user, role and backup administration.',
    permissions: expandPermissions({
      ...Object.fromEntries(ALL_FEATURE_MODULES.map((m) => [m, '*'])),
      users: '*', roles: '*', permissions: '*', backup: '*', storage: '*', env: '*', api: '*', audit: ['view', 'export'], settings: '*',
    }),
  },
  senior_advocate: {
    code: 'senior_advocate',
    name: 'Senior Advocate',
    description: 'Senior practitioner — full case, drafting, research and approval rights.',
    permissions: expandPermissions({
      dashboard: ['view'],
      drafting: '*', citations: '*', verify: '*', research: '*', analysis: '*',
      strategy: '*', crossExamination: '*', evidence: '*',
      documents: ['view', 'create', 'edit', 'delete', 'export', 'upload', 'download', 'print', 'approve', 'share'],
      timeline: ['view', 'create', 'edit', 'export', 'print'],
      hearingNotes: ['view', 'create', 'edit', 'delete', 'export', 'print'],
      casevault: ['view', 'create', 'edit', 'delete', 'bulkDelete', 'export', 'assign', 'approve', 'share', 'archive', 'restore', 'print'],
      causeList: ['view', 'create', 'edit', 'delete', 'export', 'print'],
      caseManage: ['view', 'create', 'edit', 'delete', 'upload', 'download', 'export', 'print', 'assign'],
    }),
  },
  advocate: {
    code: 'advocate',
    name: 'Advocate',
    description: 'Practising advocate — day-to-day case, drafting and research work.',
    permissions: expandPermissions({
      dashboard: ['view'],
      drafting: ['view', 'create', 'edit', 'export', 'print', 'download'],
      citations: ['view', 'create', 'export'], verify: ['view'],
      research: ['view', 'create', 'export'], analysis: ['view', 'create', 'edit'],
      strategy: ['view', 'create', 'edit'], crossExamination: ['view', 'create', 'edit'],
      evidence: ['view', 'create', 'edit'],
      documents: ['view', 'create', 'upload', 'download', 'export', 'print'],
      timeline: ['view', 'create', 'edit'],
      hearingNotes: ['view', 'create', 'edit', 'print'],
      casevault: ['view', 'create', 'edit', 'export', 'share', 'print'],
      causeList: ['view', 'create', 'edit', 'print'],
      caseManage: ['view', 'create', 'edit', 'upload', 'download', 'print'],
    }),
  },
  junior_advocate: {
    code: 'junior_advocate',
    name: 'Junior Advocate',
    description: 'Junior practitioner — create and edit, limited deletion/export.',
    permissions: expandPermissions({
      dashboard: ['view'],
      drafting: ['view', 'create', 'edit', 'print'],
      citations: ['view', 'create'], verify: ['view'], research: ['view', 'create'],
      analysis: ['view', 'create'], strategy: ['view'], crossExamination: ['view', 'create'],
      evidence: ['view', 'create'],
      documents: ['view', 'create', 'upload', 'download'],
      timeline: ['view', 'create'], hearingNotes: ['view', 'create'],
      casevault: ['view', 'create', 'edit'], causeList: ['view', 'create'],
      caseManage: ['view', 'create', 'upload', 'download'],
    }),
  },
  clerk: {
    code: 'clerk',
    name: 'Clerk',
    description: 'Court clerk — cause-list, documents and hearing logistics.',
    permissions: expandPermissions({
      dashboard: ['view'],
      documents: ['view', 'upload', 'download', 'print'],
      timeline: ['view'], hearingNotes: ['view', 'create'],
      casevault: ['view'], causeList: ['view', 'create', 'edit', 'print'],
      caseManage: ['view', 'upload', 'download'],
    }),
  },
  data_entry_operator: {
    code: 'data_entry_operator',
    name: 'Data Entry Operator',
    description: 'Data entry — create and upload records only.',
    permissions: expandPermissions({
      dashboard: ['view'],
      documents: ['view', 'create', 'upload'],
      casevault: ['view', 'create'], caseManage: ['view', 'create', 'upload'],
      causeList: ['view', 'create'],
    }),
  },
  receptionist: {
    code: 'receptionist',
    name: 'Receptionist',
    description: 'Front desk — read-only visibility of cases and cause list.',
    permissions: expandPermissions({
      dashboard: ['view'], casevault: ['view'], causeList: ['view'], caseManage: ['view'],
    }),
  },
  custom: {
    code: 'custom',
    name: 'Custom',
    description: 'Start from a blank slate and configure every permission manually.',
    permissions: [],
  },
};

export const TEMPLATE_KEYS = Object.keys(ROLE_TEMPLATES);

// Permission assignment provenance (used by Permission Manager visual indicators).
export const PERM_SOURCE = {
  INHERITED: 'inherited', // from role / role hierarchy  (green)
  CUSTOM: 'custom',       // explicit user grant          (blue)
  DENIED: 'denied',       // explicit user deny override  (red)
  NONE: 'none',
};

export default { ACTIONS, MODULES, ROLE_HIERARCHY, ROLE_TEMPLATES, PERM_SOURCE };

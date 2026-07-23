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
  { key: 'duplicate', label: 'Duplicate' },
  { key: 'generate', label: 'Generate' },
  { key: 'execute', label: 'Execute' },
  { key: 'manage', label: 'Manage' },
  { key: 'configure', label: 'Configure' },
  { key: 'publish', label: 'Publish' },
  { key: 'lock', label: 'Lock' },
  { key: 'unlock', label: 'Unlock' },
  { key: 'manageSettings', label: 'Manage Settings' },
  { key: 'sync', label: 'Sync' },
  { key: 'secrets', label: 'Secrets' },
  { key: 'test', label: 'Test' },
  { key: 'protect', label: 'Protect' },
  { key: 'settings', label: 'Settings' },
];

export const ACTION_KEYS = ACTIONS.map((a) => a.key);

// Single source of truth for RBAC modules. Every entry here MUST have a matching
// route guard (G(module) in routes/index.jsx) and a matching sidebar entry
// (module key in routes/navigation.js). Sub-pages that are governed by a parent
// module (e.g. the drafting sub-pages are all part of `drafting`) are NOT listed
// as separate modules — only the authorizable units are. CRUD is controlled by
// the action, not by a separate module key.
export const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', route: '/' },
  { key: 'drafting', label: 'Drafting Studio', icon: 'pen', route: '/drafting' },
  { key: 'citations', label: 'Citation Search', icon: 'search', route: '/research/citations' },
  { key: 'verify', label: 'Citation Verify', icon: 'shield', route: '/research/citation-verify' },
  { key: 'research', label: 'Legal Research', icon: 'book', route: '/research' },
  { key: 'analysis', label: 'Case Analysis', icon: 'scan', route: '/research/case-analysis' },
  { key: 'strategy', label: 'Strategy Engine', icon: 'target', route: '/research/strategy' },
  { key: 'crossExamination', label: 'Cross Examination', icon: 'mic', route: '/research/cross-examination' },
  { key: 'evidence', label: 'Evidence Gap', icon: 'layers', route: '/research/evidence-gap' },
  { key: 'actLibrary', label: 'Act Library', icon: 'book', route: '/research/act-library' },
  { key: 'judgmentLibrary', label: 'Judgment Library', icon: 'book', route: '/judgment-library' },
  { key: 'documents', label: 'Documents', icon: 'file', route: '/documents' },
  { key: 'legalNotices', label: 'Legal Notices', icon: 'doc', route: '/drafting/legal-notices' },
  { key: 'timeline', label: 'Case Timeline', icon: 'clock', route: '/cases/case-timeline' },
  { key: 'hearingNotes', label: 'Hearing Notes', icon: 'notes', route: '/cases/hearings' },
  { key: 'manageCase', label: 'Manage Cases', icon: 'vault', route: '/cases' },
  { key: 'orderSheet', label: 'Order Sheet', icon: 'calendar', route: '/cases/order-sheet' },
  { key: 'calendar', label: 'Calendar & Tasks', icon: 'calendar', route: '/calendar' },
  { key: 'clients', label: 'Clients', icon: 'users', route: '/clients' },
  { key: 'advocates', label: 'Advocates', icon: 'users', route: '/advocates' },
  { key: 'contacts', label: 'Contacts', icon: 'book', route: '/contacts' },
  { key: 'aiAssistant', label: 'AI Assistant', icon: 'bolt', route: '/tools/ai' },
  { key: 'promptLibrary', label: 'Prompt Library', icon: 'book', route: '/tools/ai/prompts' },
  { key: 'aiUsage', label: 'AI Usage Logs', icon: 'clock', route: '/tools/ai/usage' },
  { key: 'reports', label: 'Reports & Analytics', icon: 'grid', route: '/tools/reports' },
  { key: 'testDesign', label: 'Test Design Page', icon: 'grid', route: '/test-design' },
  // Court management sub-types
  { key: 'caseTypes', label: 'Case Types', icon: 'folder', route: '/court-management/case-types' },
  { key: 'courtTypes', label: 'Court Types', icon: 'folder', route: '/court-management/courts' },
  // Administration modules
  { key: 'users', label: 'User Management', icon: 'users', route: '/admin/users' },
  { key: 'roles', label: 'Role Management', icon: 'badge', route: '/admin/roles' },
  { key: 'permissions', label: 'Permission Center', icon: 'lock', route: '/admin/permissions' },
  { key: 'storage', label: 'Storage & Sync', icon: 'database', route: '/admin/storage' },
  { key: 'env', label: 'Environment Variables', icon: 'gear', route: '/admin/env-api' },
  { key: 'api', label: 'API Manager', icon: 'bolt', route: '/admin/env-api' },
  { key: 'settings', label: 'System Settings', icon: 'gear', route: '/admin/settings' },
  { key: 'security', label: 'Security Settings', icon: 'shield', route: '/admin/security' },
  { key: 'backup', label: 'Backup & Recovery', icon: 'database', route: '/admin/database-center/backup-recovery' },
  { key: 'audit', label: 'Audit Logs', icon: 'history', route: '/admin/database-center/audit-activity' },
  { key: 'schema', label: 'Schema Manager', icon: 'database', route: '/admin/database-center/data-explorer' },
  { key: 'databaseCenter', label: 'Database Center', icon: 'database', route: '/admin/database-center' },
  { key: 'setupWizard', label: 'Setup Wizard', icon: 'wrench', route: '/admin/setup-wizard' },
  { key: 'changelog', label: 'Changelog', icon: 'history', route: '/admin/changelog' },
];

export const MODULE_KEYS = MODULES.map((m) => m.key);
export const MODULE_MAP = Object.fromEntries(MODULES.map((m) => [m.key, m]));

export function permKey(module, action) {
  return `${module}.${action}`;
}

export const PERM_SOURCE = {
  INHERITED: 'inherited',
  CUSTOM: 'custom',
  DENIED: 'denied',
  NONE: 'none',
};

export default { ACTIONS, MODULES, PERM_SOURCE };

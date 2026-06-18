// Single source of truth for navigation + sidebar grouping.
// Pages are referenced by path only; the route table in routes/index.jsx maps
// them to components. Each item carries a `module` key so the sidebar can hide
// entries the current user has no `view` permission for.
export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: 'grid', end: true, module: 'dashboard' },
    ],
  },
  {
    label: 'Drafting & Research',
    items: [
      { to: '/drafting', label: 'Drafting Studio', icon: 'pen', module: 'drafting' },
      { to: '/citations', label: 'Citation Search', icon: 'search', module: 'citations' },
      { to: '/verify', label: 'Citation Verify', icon: 'shield', module: 'verify' },
      { to: '/research', label: 'Legal Research', icon: 'book', module: 'research' },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { to: '/analysis', label: 'Case Analysis', icon: 'scan', module: 'analysis' },
      { to: '/strategy', label: 'Strategy Engine', icon: 'target', module: 'strategy' },
      { to: '/cross-examination', label: 'Cross Examination', icon: 'mic', module: 'crossExamination' },
      { to: '/evidence', label: 'Evidence Gap', icon: 'layers', module: 'evidence' },
      { to: '/documents', label: 'Document Review', icon: 'file', module: 'documents' },
      { to: '/timeline', label: 'Timeline Builder', icon: 'clock', module: 'timeline' },
      { to: '/hearing-notes', label: 'Hearing Notes', icon: 'notes', module: 'hearingNotes' },
    ],
  },
  {
    label: 'Case Management',
    items: [
      { to: '/cases', label: 'Case Vault', icon: 'vault', module: 'casevault' },
      { to: '/cause-list', label: 'Cause List', icon: 'calendar', module: 'causeList' },
      { to: '/case-manage', label: 'Case Manager', icon: 'folder', module: 'caseManage' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin/users', label: 'User Management', icon: 'users', module: 'users' },
      { to: '/admin/roles', label: 'Role Management', icon: 'badge', module: 'roles' },
      { to: '/admin/permissions', label: 'Permission Center', icon: 'lock', module: 'permissions' },
      { to: '/admin/permission-manager', label: 'Permission Manager', icon: 'lock', module: 'permissions' },
      { to: '/admin/backup', label: 'Backup & Recovery', icon: 'database', module: 'backup' },
      { to: '/admin/storage', label: 'Storage & Sync', icon: 'database', module: 'storage' },
      { to: '/admin/env-api', label: 'Environment & API', icon: 'gear', module: 'env' },
      { to: '/admin/audit', label: 'Audit Logs', icon: 'history', module: 'audit' },
      { to: '/admin/case-types', label: 'Case Types', icon: 'folder', module: 'caseTypes' },
      { to: '/admin/court-types', label: 'Court Types', icon: 'folder', module: 'courtTypes' },
      { to: '/admin/security', label: 'Security Settings', icon: 'lock', module: 'settings' },
      { to: '/admin/settings', label: 'System Settings', icon: 'gear', module: 'settings' },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default NAV_GROUPS;

export const NAV_GROUPS = [
  { type: 'heading', label: 'MAIN' },
  {
    label: '',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'grid', end: true, module: 'dashboard' },
    ],
  },
  { type: 'heading', label: 'Case Management' },
  {
    label: '',
    items: [
      {
        label: 'Cases', icon: 'folder',
        children: [
          { to: '/cases/create', label: 'Create Cases', icon: 'plus', module: 'manageCase' },
          { to: '/cases', label: 'Manage Cases', icon: 'file', end: true, module: 'manageCase' },
          { to: '/cases/order-sheet', label: 'Order Sheet', icon: 'calendar', module: 'orderSheet' },
          { to: '/cases/case-timeline', label: 'Case Timeline', icon: 'clock', module: 'timeline' },
          { to: '/cases/hearings', label: 'Hearing Notes', icon: 'notes', module: 'hearingNotes' },
        ],
      },
    ],
  },
  { type: 'heading', label: 'Reminder Center' },
  {
    label: '',
    items: [
      { to: '/reminders', label: 'Reminders', icon: 'bell', module: 'manageCase' },
      { to: '/calendar', label: 'Calendar & Tasks', icon: 'calendar' },
    ],
  },
  { type: 'heading', label: 'Contact Center' },
  {
    label: '',
    items: [
      { to: '/clients', label: 'Clients', icon: 'users' },
      { to: '/advocates', label: 'Advocates', icon: 'users' },
      { to: '/contacts', label: 'Contacts', icon: 'book' },
    ],
  },
  { type: 'heading', label: 'Document Center' },
  {
    label: '',
    items: [
      { to: '/documents', label: 'Case Documents', icon: 'folder', end: true, module: 'caseManage' },
      { to: '/documents/review', label: 'Document Review', icon: 'scan', module: 'documents' },
    ],
  },
  { type: 'heading', label: 'Knowledge Library' },
  {
    label: '',
    items: [
      { to: '/judgment-library', label: 'Judgment Library', icon: 'book', module: 'research' },
      { to: '/research/act-library', label: 'Act Library', icon: 'book', module: 'research' },
    ],
  },
  { type: 'heading', label: 'Drafting Center' },
  {
    label: '',
    items: [
      { to: '/drafting', label: 'Drafting Studio', icon: 'pen', end: true, module: 'drafting' },
      { to: '/drafting/templates', label: 'Templates Library', icon: 'copy', module: 'drafting' },
      { to: '/drafting/legal-notices', label: 'Legal Notices', icon: 'doc', module: 'drafting' },
      { to: '/drafting/version-control', label: 'Version Control', icon: 'history', module: 'drafting' },
      { to: '/drafting/archive', label: 'Document Archive', icon: 'folder', module: 'drafting' },
    ],
  },
  { type: 'heading', label: 'Research & Analysis' },
  {
    label: '',
    items: [
      { to: '/research', label: 'Legal Research', icon: 'book', end: true, module: 'research' },
      { to: '/research/citations', label: 'Citation Search', icon: 'search', module: 'citations' },
      { to: '/research/citation-verify', label: 'Citation Verification', icon: 'shield', module: 'verify' },
      { to: '/research/case-analysis', label: 'Case Analysis', icon: 'scan', module: 'analysis' },
      { to: '/research/strategy', label: 'Strategy Engine', icon: 'target', module: 'strategy' },
      { to: '/research/cross-examination', label: 'Cross Examination', icon: 'mic', module: 'crossExamination' },
      { to: '/research/evidence-gap', label: 'Evidence Gap Analysis', icon: 'layers', module: 'evidence' },
    ],
  },
  { type: 'heading', label: 'COURT MANAGEMENT' },
  {
    label: '',
    items: [
      {
        label: 'Court Directory', icon: 'folder',
        children: [
          { to: '/court-management/courts', label: 'Courts', icon: 'layers', module: 'courtTypes' },
          { to: '/court-management/case-types', label: 'Case Types', icon: 'badge', module: 'caseTypes' },
          { to: '/court-management/case-stages', label: 'Case Stages', icon: 'layers', module: 'courtTypes' },
          { to: '/court-management/case-statuses', label: 'Case Statuses', icon: 'toggle', module: 'courtTypes' },
          { to: '/court-management/bench-types', label: 'Bench Types', icon: 'users', module: 'courtTypes' },
          { to: '/court-management/jurisdictions', label: 'Jurisdictions', icon: 'grid', module: 'courtTypes' },
          { to: '/court-management/party-types', label: 'Party Types', icon: 'users', module: 'courtTypes' },
          { to: '/court-management/judges', label: 'Judges', icon: 'users', module: 'courtTypes' },
          { to: '/court-management/priorities', label: 'Priorities', icon: 'flag', module: 'courtTypes' },
        ],
      },
    ],
  },
  { type: 'heading', label: 'ADMINISTRATION' },
  {
    label: '',
    items: [
      { to: '/admin/users', label: 'Users', icon: 'users', module: 'users' },
      { to: '/admin/roles', label: 'Roles & Permissions', icon: 'lock', module: 'roles' },
      {
        label: 'Database Center', icon: 'database',
        children: [
          { to: '/admin/database-center/dashboard', label: 'Dashboard', icon: 'grid', module: 'admin' },
          { to: '/admin/database-center/data-explorer', label: 'Data Explorer', icon: 'search', module: 'admin' },
          { to: '/admin/database-center/backup-recovery', label: 'Backup & Recovery', icon: 'database', module: 'admin' },
          { to: '/admin/database-center/import', label: 'Import Center', icon: 'download', module: 'admin' },
          { to: '/admin/database-center/export', label: 'Export Center', icon: 'upload', module: 'admin' },
          { to: '/admin/database-center/delete-manager', label: 'Delete Manager', icon: 'trash', module: 'admin' },
          { to: '/admin/database-center/maintenance', label: 'Maintenance', icon: 'wrench', module: 'admin' },
          { to: '/admin/database-center/migration', label: 'Migration', icon: 'migrate', module: 'admin' },
          { to: '/admin/database-center/audit-activity', label: 'Audit & Activity', icon: 'activity', module: 'admin' },
        ],
      },
      {
        label: 'System Config', icon: 'gear',
        children: [
          { to: '/admin/security', label: 'Security Settings', icon: 'shield', module: 'settings' },
          { to: '/admin/env-api', label: 'Env & API Manager', icon: 'globe', module: 'env' },
          { to: '/admin/storage', label: 'Storage Settings', icon: 'folder', module: 'storage' },
          { to: '/admin/permission-manager', label: 'Permission Manager', icon: 'lock', module: 'permissions' },
          { to: '/admin/setup-wizard', label: 'Setup Wizard', icon: 'wrench', module: 'admin' },
        ],
      },
    ],
  },
  { type: 'heading', label: 'DEVELOPMENT' },
  {
    label: '',
    items: [
      { to: '/test-design', label: 'Test Design Page', icon: 'grid' },
    ],
  },
  { type: 'heading', label: 'TOOLS' },
  {
    label: '',
    items: [
      {
        label: 'AI Center', icon: 'bolt',
        children: [
          { to: '/tools/ai', label: 'AI Assistant', icon: 'bolt', module: 'drafting' },
          { to: '/tools/ai/prompts', label: 'Prompt Library', icon: 'book', module: 'drafting' },
          { to: '/tools/ai/usage', label: 'AI Usage Logs', icon: 'clock', module: 'drafting' },
        ],
      },
      {
        label: 'Reports & Analytics', icon: 'grid',
        children: [
          { to: '/tools/reports/cases', label: 'Case Reports', icon: 'folder' },
          { to: '/tools/reports/courts', label: 'Court Reports', icon: 'folder' },
          { to: '/tools/reports/activity', label: 'User Activity', icon: 'users' },
          { to: '/tools/reports/ai-usage', label: 'AI Usage Reports', icon: 'bolt' },
          { to: '/tools/reports/performance', label: 'Performance Analytics', icon: 'grid' },
          { to: '/tools/reports/custom', label: 'Custom Reports', icon: 'file' },
        ],
      },
    ],
  },
  { type: 'heading', label: 'SYSTEM SETTINGS' },
  {
    label: '',
    items: [
      { to: '/settings', label: 'System Settings', icon: 'gear', module: 'settings' },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => {
  if (g.type === 'heading') return [];
  const items = [];
  for (const item of (g.items || [])) {
    if (item.children) items.push(...item.children);
    else items.push(item);
  }
  return items;
});

export default NAV_GROUPS;

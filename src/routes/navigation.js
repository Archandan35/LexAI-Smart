export const NAV_GROUPS = [
  { type: 'heading', label: 'MAIN' },
  {
    label: '',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'grid', end: true, module: 'dashboard' },
    ],
  },
  {
    label: 'Case Management',
    items: [
      {
        label: 'Cases', icon: 'folder',
        children: [
          { to: '/cases/create', label: 'Create Case', icon: 'plus', module: 'casevault' },
          { to: '/cases/manage', label: 'Manage Cases', icon: 'list', module: 'caseManage' },
          { to: '/cases', label: 'Case Details', icon: 'file', end: true, module: 'casevault' },
          { to: '/cases/cause-list', label: 'Cause List', icon: 'calendar', module: 'causeList' },
          { to: '/cases/hearings', label: 'Hearings', icon: 'mic', module: 'hearingNotes' },
          { to: '/cases/timeline', label: 'Timeline Builder', icon: 'clock', module: 'timeline' },
        ],
      },
      { to: '/calendar', label: 'Calendar', icon: 'calendar' },
      { to: '/tasks', label: 'Tasks & Reminders', icon: 'check' },
      { to: '/clients', label: 'Clients', icon: 'users' },
      { to: '/contacts', label: 'Contacts', icon: 'book' },
    ],
  },
  {
    label: 'Drafting Center',
    items: [
      { to: '/drafting', label: 'Drafting Studio', icon: 'pen', end: true, module: 'drafting' },
      { to: '/drafting/templates', label: 'Templates Library', icon: 'copy', module: 'drafting' },
      { to: '/drafting/legal-notices', label: 'Legal Notices', icon: 'doc', module: 'drafting' },
      { to: '/drafting/version-control', label: 'Version Control', icon: 'history', module: 'drafting' },
      { to: '/drafting/archive', label: 'Document Archive', icon: 'folder', module: 'drafting' },
    ],
  },
  {
    label: 'Document Center',
    items: [
      { to: '/documents', label: 'Case Documents', icon: 'folder', end: true, module: 'caseManage' },
      { to: '/documents/review', label: 'Document Review', icon: 'scan', module: 'documents' },
    ],
  },
  {
    label: 'Research & Analysis',
    items: [
      { to: '/research', label: 'Legal Research', icon: 'book', end: true, module: 'research' },
      { to: '/research/citations', label: 'Citation Search', icon: 'search', module: 'citations' },
      { to: '/research/citation-verify', label: 'Citation Verification', icon: 'shield', module: 'verify' },
      { to: '/research/case-analysis', label: 'Case Analysis', icon: 'scan', module: 'analysis' },
      { to: '/research/strategy', label: 'Strategy Engine', icon: 'target', module: 'strategy' },
      { to: '/research/cross-examination', label: 'Cross Examination', icon: 'mic', module: 'crossExamination' },
      { to: '/research/evidence-gap', label: 'Evidence Gap Analysis', icon: 'layers', module: 'evidence' },
      { to: '/research/act-library', label: 'Act Library', icon: 'book', module: 'research' },
      { to: '/research/judgment-library', label: 'Judgment Library', icon: 'database', module: 'research' },
      { to: '/research/precedent-vault', label: 'Precedent Vault', icon: 'star', module: 'research' },
    ],
  },
  {
    label: 'Court Management',
    items: [
      { to: '/court-management/courts', label: 'Courts', icon: 'folder', module: 'courtTypes' },
      { to: '/court-management/hierarchy', label: 'Court Hierarchy', icon: 'layers', module: 'courtTypes' },
      { to: '/court-management/bench-types', label: 'Bench Types', icon: 'users', module: 'courtTypes' },
      { to: '/court-management/case-types', label: 'Case Types', icon: 'badge', module: 'caseTypes' },
      { to: '/court-management/jurisdictions', label: 'Jurisdictions', icon: 'grid', module: 'courtTypes' },
    ],
  },
  { type: 'heading', label: 'ADMINISTRATION' },
  {
    label: '',
    items: [
      { to: '/admin/users', label: 'Users', icon: 'users', module: 'users' },
      { to: '/admin/roles-permissions', label: 'Roles & Permissions', icon: 'lock', module: 'roles' },
      { to: '/admin/activity', label: 'Activity Monitoring', icon: 'history', module: 'audit' },
      {
        label: 'Backup & Database', icon: 'database',
        children: [
          { to: '/admin/backup', label: 'Backup Management', icon: 'database', module: 'backup' },
          { to: '/admin/backup/restore', label: 'Restore Center', icon: 'refresh', module: 'backup' },
          { to: '/admin/storage', label: 'Storage & Sync', icon: 'cloud', module: 'storage' },
          { to: '/admin/database', label: 'Database Manager', icon: 'database', module: 'settings' },
          { to: '/admin/schema', label: 'Schema Manager', icon: 'layers', module: 'schema' },
          { to: '/admin/database/sql', label: 'SQL Console', icon: 'code', module: 'settings' },
        ],
      },
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

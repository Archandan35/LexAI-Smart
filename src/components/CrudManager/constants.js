export const TABS = [
  { id: 'single-add', label: 'Single Add', icon: 'plus', group: 'single' },
  { id: 'single-edit', label: 'Single Edit', icon: 'edit', group: 'single' },
  { id: 'single-delete', label: 'Single Delete', icon: 'trash', group: 'single', danger: true },
  { id: 'bulk-add', label: 'Bulk Add', icon: 'users', group: 'bulk' },
  { id: 'bulk-edit', label: 'Bulk Edit', icon: 'edit', group: 'bulk' },
  { id: 'bulk-delete', label: 'Bulk Delete', icon: 'trash', group: 'bulk', danger: true },
  { id: 'import', label: 'Import', icon: 'upload', group: 'import', special: 'import' },
];

export const BULK_SAMPLE_NAMES = {
  Courts: ['High Court', 'District Court', 'Session Court'],
  'Bench Type': ['Division Bench', 'Single Bench', 'Full Bench'],
  'Case Type': ['Civil Suit', 'Criminal Case', 'Writ Petition'],
  Jurisdiction: ['Civil', 'Criminal', 'Family'],
  Stage: ['Pleading', 'Hearing', 'Order'],
  Priority: ['High', 'Medium', 'Low'],
  Status: ['Pending', 'Disposed', 'Active'],
  Judge: ['Justice Sharma', 'Justice Verma'],
  'Party Type': ['Plaintiff', 'Respondent', 'Petitioner'],
};

export const entityHasShortCode = (config) => (config?.fields || []).some((f) => f.key === 'short_code');

export const TIPS = {
  'single-add': (e, c) => `Use meaningful names${entityHasShortCode(c) ? ' and short codes' : ''} for better organization and quick identification.`,
  'single-edit': (e) => `Editing a ${e} name updates it across all associated records.`,
  'single-delete': (e) => `Ensure no active cases are using this ${e} before deleting.`,
  'bulk-add': (e, c) => entityHasShortCode(c)
    ? `Format: Name:CODE per line — e.g. "High Court: COUT-HIGH-COURT". Include the full prefixed short code (uppercase).`
    : `Enter one ${e} name per line. Blank lines are ignored.`,
  'bulk-edit': (e) => `Select items then fill in the new values. Only filled fields will be updated.`,
  'bulk-delete': (e) => `Double-check your selection before confirming — deleted ${e}s cannot be recovered.`,
  'import': (e) => `CSV must have a header row. Supported columns match the ${e} fields shown above.`,
};

export const SUBTITLES = {
  'single-add': (e) => `Add a new ${e} to your practice.`,
  'single-edit': (e) => `Edit an existing ${e}.`,
  'single-delete': (e) => `Remove a ${e} from your practice.`,
  'bulk-add': (e) => `Add multiple ${e}s at once.`,
  'bulk-edit': (e) => `Update multiple ${e}s in one operation.`,
  'bulk-delete': (e) => `Remove multiple ${e}s in one operation.`,
  'import': (e) => `Import ${e}s from a CSV file.`,
};

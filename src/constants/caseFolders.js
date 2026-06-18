// Default folder structures for a case's documents and drafts. Folders are
// managed dynamically per-case (caseFolders collection); these seed a new case.

export const DEFAULT_DOC_FOLDERS = [
  'Suit',
  'Petition',
  'Written Statement',
  'Evidence',
  'Affidavit',
  'Exhibits',
  'Orders',
  'Judgments',
  'Miscellaneous',
];

export const DEFAULT_DRAFT_FOLDERS = [
  'Petitions',
  'Written Statements',
  'Objections',
  'Affidavits',
  'Notes',
  'Miscellaneous',
];

// Suggested case tags (custom tags also allowed).
export const CASE_TAGS = [
  'Urgent',
  'High Priority',
  'Evidence Pending',
  'Appeal',
  'Stay Order',
];

// Draft file types supported by the editor.
export const DRAFT_FILE_TYPES = ['docx', 'pdf', 'txt', 'md'];
export const DEFAULT_DRAFT_FILE_TYPE = 'docx';

export default DEFAULT_DOC_FOLDERS;

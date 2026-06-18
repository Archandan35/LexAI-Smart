export const COURTS = [
  'Supreme Court of India',
  'High Court',
  'District & Sessions Court',
  'Civil Judge (Sr. Dvn.)',
  'Civil Judge (Jr. Dvn.)',
  'Judicial Magistrate First Class',
  'Family Court',
  'Commercial Court',
  'Consumer Forum',
  'Tribunal',
];

// Default seed stages. Stages are managed dynamically at runtime (caseStages
// collection) via the Stage Manager — this list only seeds an empty install.
export const CASE_STAGES = [
  'Filing',
  'Admission',
  'Notice',
  'Written Statement',
  'Issues Framed',
  'Plaintiff Evidence',
  'Defendant Evidence',
  'Cross Examination',
  'Argument',
  'Judgment Reserved',
  'Judgment Delivered',
  'Appeal',
  'Execution',
  'Disposed',
];

export const HEARING_STATUS = [
  'Scheduled',
  'Adjourned',
  'Part Heard',
  'Reserved for Orders',
  'Disposed',
  'Next Date Awaited',
];

export default COURTS;

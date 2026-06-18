// Draft document types supported by the Drafting Studio.
export const DRAFT_TYPES = [
  { id: 'plaint', label: 'Plaint', group: 'Suit' },
  { id: 'written_statement', label: 'Written Statement', group: 'Suit' },
  { id: 'counter_claim', label: 'Counter Claim', group: 'Suit' },
  { id: 'amendment_petition', label: 'Amendment Petition', group: 'Application' },
  { id: 'affidavit', label: 'Affidavit', group: 'Affidavit' },
  { id: 'evidence_affidavit', label: 'Evidence Affidavit (Examination-in-Chief)', group: 'Affidavit' },
  { id: 'written_argument', label: 'Written Argument', group: 'Argument' },
  { id: 'legal_notice', label: 'Legal Notice', group: 'Notice' },
  { id: 'appeal', label: 'Appeal (Memo of Appeal)', group: 'Appellate' },
  { id: 'revision', label: 'Revision Petition', group: 'Appellate' },
  { id: 'review', label: 'Review Petition', group: 'Appellate' },
  { id: 'bail', label: 'Bail Application', group: 'Criminal' },
];

export const DRAFT_TYPE_MAP = Object.fromEntries(DRAFT_TYPES.map((d) => [d.id, d]));

export default DRAFT_TYPES;

// Statute corpus used by the Legal Research Workspace.
// Research MUST use retrieval against this corpus, not AI memory.
export const ACTS = [
  { id: 'cpc', label: 'Code of Civil Procedure, 1908', short: 'CPC' },
  { id: 'evidence_act', label: 'Indian Evidence Act, 1872', short: 'Evidence Act' },
  { id: 'bsa', label: 'Bharatiya Sakshya Adhiniyam, 2023', short: 'BSA' },
  { id: 'bnss', label: 'Bharatiya Nagarik Suraksha Sanhita, 2023', short: 'BNSS' },
  { id: 'bns', label: 'Bharatiya Nyaya Sanhita, 2023', short: 'BNS' },
  { id: 'limitation_act', label: 'Limitation Act, 1963', short: 'Limitation Act' },
  { id: 'registration_act', label: 'Registration Act, 1908', short: 'Registration Act' },
  { id: 'tp_act', label: 'Transfer of Property Act, 1882', short: 'TP Act' },
  { id: 'constitution', label: 'Constitution of India, 1950', short: 'Constitution' },
];

export const ACT_MAP = Object.fromEntries(ACTS.map((a) => [a.id, a]));

export default ACTS;

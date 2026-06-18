// Seed dataset for the local/in-memory providers. This stands in for a real DB
// so the whole app is runnable with zero external services. Swapping to a real
// database means implementing the DatabaseProvider interface — this file stays
// as nothing more than demo fixtures.

export const seedCases = [
  {
    id: 'case_001',
    caseNumber: 'O.S. No. 482/2023',
    title: 'Ramesh Kumar vs. Sunil Traders',
    court: 'Civil Judge (Sr. Dvn.)',
    stage: 'Plaintiff Evidence',
    parties: { plaintiff: 'Ramesh Kumar', defendant: 'Sunil Traders' },
    description: 'Suit for recovery of money and damages for breach of supply contract dated 12-03-2021.',
    nextHearing: '2026-06-25',
    status: 'Active',
    createdAt: '2023-08-14T09:00:00.000Z',
    tags: ['recovery', 'contract'],
  },
  {
    id: 'case_002',
    caseNumber: 'O.S. No. 91/2024',
    title: 'Lakshmi Devi vs. Corporation of City',
    court: 'Civil Judge (Jr. Dvn.)',
    stage: 'Framing of Issues',
    parties: { plaintiff: 'Lakshmi Devi', defendant: 'Corporation of City' },
    description: 'Declaration of title and permanent injunction over Plot No. 47, Khata No. 221/3.',
    nextHearing: '2026-06-19',
    status: 'Active',
    createdAt: '2024-02-02T09:00:00.000Z',
    tags: ['title', 'injunction', 'property'],
  },
  {
    id: 'case_003',
    caseNumber: 'Crl. M.C. No. 1180/2025',
    title: 'State vs. Mohan Rao',
    court: 'District & Sessions Court',
    stage: 'Final Arguments',
    parties: { plaintiff: 'State', defendant: 'Mohan Rao' },
    description: 'Bail application under BNSS; allegations under BNS sections relating to cheating.',
    nextHearing: '2026-06-18',
    status: 'Active',
    createdAt: '2025-11-20T09:00:00.000Z',
    tags: ['bail', 'criminal'],
  },
];

export const seedDrafts = [
  {
    id: 'draft_001',
    caseId: 'case_001',
    type: 'plaint',
    title: 'Plaint — Ramesh Kumar vs. Sunil Traders',
    content: 'IN THE COURT OF THE CIVIL JUDGE (SR. DVN.)\n\nO.S. No. 482 of 2023\n\nRamesh Kumar … Plaintiff\nVersus\nSunil Traders … Defendant\n\nThe plaintiff above-named most respectfully submits…',
    versions: [],
    updatedAt: '2026-06-10T11:30:00.000Z',
    createdAt: '2023-08-14T10:00:00.000Z',
  },
  {
    id: 'draft_002',
    caseId: 'case_002',
    type: 'written_argument',
    title: 'Written Argument — Lakshmi Devi',
    content: 'WRITTEN ARGUMENTS ON BEHALF OF THE PLAINTIFF\n\n1. That the plaintiff is the absolute owner…',
    versions: [],
    updatedAt: '2026-06-15T08:10:00.000Z',
    createdAt: '2024-03-01T10:00:00.000Z',
  },
];

// Real, well-known reported judgments. Used as the LOCAL citation index so the
// app demonstrates verification with genuine authorities (never fabricated).
export const seedJudgments = [
  {
    id: 'j_carlill',
    citation: 'Carlill v. Carbolic Smoke Ball Co., (1893) 1 QB 256',
    court: 'Court of Appeal (England)',
    date: '1892-12-07',
    keywords: ['contract', 'offer', 'acceptance', 'unilateral', 'consideration'],
    acts: [],
    paragraphs: [
      { number: 1, text: 'An advertisement promising a reward constitutes an offer to the world capable of acceptance by performance.' },
      { number: 2, text: 'Performance of the condition is sufficient acceptance without notification.' },
    ],
    sourceUrl: 'https://www.bailii.org/ew/cases/EWCA/Civ/1892/1.html',
  },
  {
    id: 'j_kesavananda',
    citation: 'Kesavananda Bharati v. State of Kerala, (1973) 4 SCC 225',
    court: 'Supreme Court of India',
    date: '1973-04-24',
    keywords: ['constitution', 'basic structure', 'amendment', 'fundamental rights'],
    acts: ['constitution'],
    paragraphs: [
      { number: 292, text: 'Parliament has wide powers of amending the Constitution but it does not extend to altering the basic structure or framework of the Constitution.' },
    ],
    sourceUrl: 'https://main.sci.gov.in/',
  },
  {
    id: 'j_anil_rai',
    citation: 'Anil Rai v. State of Bihar, (2001) 7 SCC 318',
    court: 'Supreme Court of India',
    date: '2001-08-06',
    keywords: ['judgment', 'delay', 'pronouncement', 'criminal'],
    acts: ['bnss'],
    paragraphs: [
      { number: 9, text: 'Inordinate delay in delivery of judgment after conclusion of arguments may itself be a ground for grievance and guidelines were laid down for timely pronouncement.' },
    ],
    sourceUrl: 'https://main.sci.gov.in/',
  },
  {
    id: 'j_balaji',
    citation: 'A.L.S. Production v. Saregama, (2011) 5 SCC 1',
    court: 'Supreme Court of India',
    date: '2011-03-15',
    keywords: ['limitation', 'condonation', 'delay', 'sufficient cause'],
    acts: ['limitation_act'],
    paragraphs: [
      { number: 14, text: 'Sufficient cause for condonation of delay must be construed liberally to advance substantial justice where no negligence or inaction is imputable to the party.' },
    ],
    sourceUrl: 'https://main.sci.gov.in/',
  },
  {
    id: 'j_sopan',
    citation: 'Sopan Sukhdeo Sable v. Asst. Charity Commr., (2004) 3 SCC 137',
    court: 'Supreme Court of India',
    date: '2004-02-17',
    keywords: ['rejection of plaint', 'order vii rule 11', 'cause of action', 'cpc'],
    acts: ['cpc'],
    paragraphs: [
      { number: 11, text: 'For deciding an application under Order VII Rule 11 CPC, the averments in the plaint are germane; the pleas taken by the defendant in the written statement are wholly irrelevant.' },
    ],
    sourceUrl: 'https://main.sci.gov.in/',
  },
];

export const seedDocuments = [
  {
    id: 'doc_001',
    caseId: 'case_001',
    name: 'Supply Agreement 2021.pdf',
    folder: 'Suit Copy',
    mime: 'application/pdf',
    size: 184320,
    uploadedAt: '2023-08-14T09:30:00.000Z',
    text: 'SUPPLY AGREEMENT dated 12-03-2021 between Ramesh Kumar and Sunil Traders for supply of goods. O.S. No. 482/2023. Ramesh Kumar vs Sunil Traders. Plot No. 12 Industrial Area. Total value Rs. 8,40,000.',
  },
  {
    id: 'doc_002',
    caseId: 'case_002',
    name: 'Sale Deed Plot 47.pdf',
    folder: 'Suit Copy',
    mime: 'application/pdf',
    size: 220160,
    uploadedAt: '2024-02-02T09:30:00.000Z',
    text: 'SALE DEED registered on 04-06-2009 conveying Plot No. 47, Khata No. 221/3 to Lakshmi Devi. Survey No. 88/2. Lakshmi Devi vs Corporation of City.',
  },
];

export const seedHearings = [
  { id: 'hg_001', caseId: 'case_001', date: '2026-06-25', status: 'Scheduled', purpose: 'Plaintiff evidence (PW-1 cross)', notes: '' },
  { id: 'hg_002', caseId: 'case_002', date: '2026-06-19', status: 'Scheduled', purpose: 'Framing of issues', notes: '' },
  { id: 'hg_003', caseId: 'case_003', date: '2026-06-18', status: 'Scheduled', purpose: 'Arguments on bail', notes: '' },
  { id: 'hg_004', caseId: 'case_001', date: '2026-05-20', status: 'Adjourned', purpose: 'Awaiting documents', notes: 'Adjourned at defendant request.' },
];

export const seedNotes = [
  { id: 'note_001', caseId: 'case_001', title: 'Strategy memo', body: 'Focus on proving delivery via Ex.P-3 challans.', createdAt: '2026-06-01T09:00:00.000Z' },
];

export const seedCauseListTemplates = [
  {
    id: 'tpl_default',
    name: 'Standard Cause List',
    isDefault: true,
    fields: ['caseNumber', 'parties', 'court', 'stage', 'purpose', 'date', 'status'],
    historyFormat: '{date} — {stage} — {purpose} — {status}',
  },
];

export const seed = {
  cases: seedCases,
  drafts: seedDrafts,
  judgments: seedJudgments,
  documents: seedDocuments,
  hearings: seedHearings,
  notes: seedNotes,
  causeListTemplates: seedCauseListTemplates,
};

export default seed;

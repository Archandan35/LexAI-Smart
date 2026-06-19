import { citationService } from '@/services/citationService.js';
import { casesRepository } from '@/data-layer/repositories/casesRepository.js';
import { draftsRepository } from '@/data-layer/repositories/draftsRepository.js';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { notesRepository } from '@/data-layer/repositories/notesRepository.js';
import { hearingsRepository } from '@/data-layer/repositories/hearingsRepository.js';

const SOURCES = [
  { repo: casesRepository, type: 'Case', icon: 'vault', module: 'casevault',
    title: (r) => r.caseNumber || r.title, subtitle: (r) => r.title, route: (r) => `/cases/${r.id}`,
    fields: (r) => [r.caseNumber, r.title, r.court, r.stage, (r.tags || []).join(' '), r.description] },
  { repo: draftsRepository, type: 'Draft', icon: 'pen', module: 'drafting',
    title: (r) => r.title, subtitle: (r) => r.type, route: () => '/drafting',
    fields: (r) => [r.title, r.type, r.content] },
  { repo: documentsRepository, type: 'Document', icon: 'file', module: 'documents',
    title: (r) => r.name, subtitle: (r) => r.folder, route: () => '/documents',
    fields: (r) => [r.name, r.folder, r.text] },
  { repo: notesRepository, type: 'Note', icon: 'notes', module: 'hearingNotes',
    title: (r) => r.title, subtitle: (r) => r.body, route: () => '/hearing-notes',
    fields: (r) => [r.title, r.body] },
  { repo: hearingsRepository, type: 'Hearing', icon: 'calendar', module: 'causeList',
    title: (r) => r.purpose || 'Hearing', subtitle: (r) => r.status, route: () => '/cause-list',
    fields: (r) => [r.purpose, r.status, r.notes] },
];

function score(haystack, terms) {
  let s = 0;
  terms.forEach((t) => { if (haystack.includes(t)) s += 1; });
  return s;
}

export const searchLogic = {
  async search(query, { can } = {}) {
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return [];
    const terms = q.match(/[a-z0-9]{2,}/g) || [q];
    const allowed = SOURCES.filter((s) => !can || can(`${s.module}.view`));

    const collections = await Promise.all(allowed.map((s) => s.repo.getAll().catch(() => [])));
    const hits = [];
    allowed.forEach((src, i) => {
      collections[i].forEach((r) => {
        const hay = (src.fields(r) || []).filter(Boolean).join(' ').toLowerCase();
        const sc = score(hay, terms);
        if (sc > 0) {
          hits.push({
            id: `${src.type}_${r.id}`, type: src.type, icon: src.icon,
            title: src.title(r) || '(untitled)', subtitle: trim(src.subtitle(r)),
            route: src.route(r), score: sc,
          });
        }
      });
    });

    if (!can || can('citations.view')) {
      try {
        const cites = await citationService.searchCases({ keywords: q, facts: q });
        cites.slice(0, 4).forEach((c) => hits.push({
          id: `cite_${c.id}`, type: 'Citation', icon: 'book',
          title: c.citation, subtitle: c.court, route: '/citations', score: 1,
        }));
      } catch { /* ignore */ }
    }

    return hits.sort((a, b) => b.score - a.score).slice(0, 30);
  },
};

function trim(s, n = 70) {
  if (!s) return '';
  const str = String(s);
  return str.length > n ? `${str.slice(0, n)}…` : str;
}

export default searchLogic;

import { databaseService } from '@/services/databaseService.js';
import { citationService } from '@/services/citationService.js';

// searchLogic — app-wide search across collections. Returns a flat, ranked list
// of hits the command bar / topbar search can render and navigate to.
// Each hit: { id, type, title, subtitle, route, icon }
const SOURCES = [
  { collection: 'cases', type: 'Case', icon: 'vault', module: 'casevault',
    title: (r) => r.caseNumber || r.title, subtitle: (r) => r.title, route: (r) => `/cases/${r.id}`,
    fields: (r) => [r.caseNumber, r.title, r.court, r.stage, (r.tags || []).join(' '), r.description] },
  { collection: 'drafts', type: 'Draft', icon: 'pen', module: 'drafting',
    title: (r) => r.title, subtitle: (r) => r.type, route: () => '/drafting',
    fields: (r) => [r.title, r.type, r.content] },
  { collection: 'documents', type: 'Document', icon: 'file', module: 'documents',
    title: (r) => r.name, subtitle: (r) => r.folder, route: () => '/documents',
    fields: (r) => [r.name, r.folder, r.text] },
  { collection: 'notes', type: 'Note', icon: 'notes', module: 'hearingNotes',
    title: (r) => r.title, subtitle: (r) => r.body, route: () => '/hearing-notes',
    fields: (r) => [r.title, r.body] },
  { collection: 'hearings', type: 'Hearing', icon: 'calendar', module: 'causeList',
    title: (r) => r.purpose || 'Hearing', subtitle: (r) => r.status, route: () => '/cause-list',
    fields: (r) => [r.purpose, r.status, r.notes] },
];

function score(haystack, terms) {
  let s = 0;
  terms.forEach((t) => { if (haystack.includes(t)) s += 1; });
  return s;
}

export const searchLogic = {
  // `can` is the permission predicate from useAuth — we never surface hits from
  // modules the user cannot view.
  async search(query, { can } = {}) {
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return [];
    const terms = q.match(/[a-z0-9]{2,}/g) || [q];
    const allowed = SOURCES.filter((s) => !can || can(`${s.module}.view`));

    const collections = await Promise.all(allowed.map((s) => databaseService.list(s.collection).catch(() => [])));
    const hits = [];
    allowed.forEach((src, i) => {
      collections[i].forEach((r) => {
        const hay = (src.fields(r) || []).filter(Boolean).join(' ').toLowerCase();
        const sc = score(hay, terms);
        if (sc > 0) {
          hits.push({
            id: `${src.collection}_${r.id}`, type: src.type, icon: src.icon,
            title: src.title(r) || '(untitled)', subtitle: trim(src.subtitle(r)),
            route: src.route(r), score: sc,
          });
        }
      });
    });

    // Verified citations (only if user can view citations).
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

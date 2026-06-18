import { caseService } from '@/services/caseService.js';
import { databaseService } from '@/services/databaseService.js';
import { ok, fail } from '@/utils/result.js';

// causeListLogic — daily/period cause list + per-case hearing history rendered
// through a user-chosen template. Templates are CRUD-managed by the user.
export const causeListLogic = {
  async causeList({ from, to } = {}) {
    try {
      const [cases, hearings] = await Promise.all([
        caseService.listCases(),
        caseService.listHearings(),
      ]);
      const caseMap = Object.fromEntries(cases.map((c) => [c.id, c]));
      const rows = hearings
        .filter((h) => inRange(h.date, from, to))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((h) => ({
          ...h,
          case: caseMap[h.caseId] || null,
          caseNumber: caseMap[h.caseId]?.caseNumber || '—',
          parties: caseMap[h.caseId]?.title || '—',
          court: caseMap[h.caseId]?.court || '—',
          stage: caseMap[h.caseId]?.stage || '—',
        }));
      return ok({ rows });
    } catch (e) {
      return fail(e);
    }
  },

  // History of a single case, formatted via the selected template string.
  async caseHistory(caseId, template) {
    try {
      const [theCase, hearings] = await Promise.all([
        caseService.getCase(caseId),
        caseService.listHearings(caseId),
      ]);
      const sorted = [...hearings].sort((a, b) => new Date(a.date) - new Date(b.date));
      const format = template?.historyFormat || '{date} — {stage} — {purpose} — {status}';
      const lines = sorted.map((h) =>
        format
          .replace('{date}', h.date || '')
          .replace('{stage}', theCase?.stage || '')
          .replace('{purpose}', h.purpose || '')
          .replace('{status}', h.status || '')
          .replace('{caseNumber}', theCase?.caseNumber || '')
          .replace('{parties}', theCase?.title || '')
          .replace('{court}', theCase?.court || '')
          .replace('{notes}', h.notes || '')
      );
      return ok({ case: theCase, hearings: sorted, lines });
    } catch (e) {
      return fail(e);
    }
  },

  addHearing: (data) => caseService.addHearing(data),
  updateHearing: (id, patch) => caseService.updateHearing(id, patch),
  deleteHearing: (id) => caseService.deleteHearing(id),

  // Template CRUD
  listTemplates: () => databaseService.list('causeListTemplates'),
  addTemplate: (data) => databaseService.create('causeListTemplates', data),
  updateTemplate: (id, patch) => databaseService.update('causeListTemplates', id, patch),
  deleteTemplate: (id) => databaseService.remove('causeListTemplates', id),
};

function inRange(date, from, to) {
  if (!from && !to) return true;
  const t = new Date(date).getTime();
  if (from && t < new Date(from).getTime()) return false;
  if (to && t > new Date(to).getTime()) return false;
  return true;
}

export default causeListLogic;

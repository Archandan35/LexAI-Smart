import { caseHistoryService } from '@/services/caseHistoryService.js';
import { caseActivityService } from '@/services/caseActivityService.js';
import { caseService } from '@/services/caseService.js';
import { ok, fail } from '@/utils/result.js';
import { DateEngine } from '@/core/index.js';

// caseHistoryLogic — the case's legal-proceedings history. Entries hold the full
// untruncated text; importable directly from the cause list (hearings).
export const caseHistoryLogic = {
  async list(caseId, { order = 'desc' } = {}) {
    const rows = await caseHistoryService.list(caseId);
    return [...rows].sort((a, b) => {
      const d = DateEngine.compare(a.date || a.createdAt, b.date || b.createdAt);
      return order === 'asc' ? d : -d;
    });
  },

  async add(caseId, { date, status, text }, user) {
    if (!text?.trim()) return fail('History text is required.');
    const row = await caseHistoryService.create({
        caseId, date: date || DateEngine.today(), status: status || '', text: text.trim(), source: 'manual', createdAt: DateEngine.now(),
    });
    await caseActivityService.record(caseId, 'history.add', 'Added case history entry', user);
    return ok(row);
  },

  async update(id, patch) { return ok(await caseHistoryService.update(id, patch)); },
  async remove(id) { return ok(await caseHistoryService.remove(id)); },

  // Import hearings (the cause-list backing data) into history. Full text is
  // assembled and never truncated; existing imported hearings are skipped.
  async importFromCauseList(caseId, user) {
    try {
      const [hearings, existing] = await Promise.all([
        caseService.listHearings(caseId),
        caseHistoryService.list(caseId),
      ]);
      const importedKeys = new Set(existing.filter((h) => h.hearingId).map((h) => h.hearingId));
      let count = 0;
      for (const h of hearings) {
        if (importedKeys.has(h.id)) continue;
        const parts = [h.purpose, h.proceedings, h.presence, h.hazira, h.orders, h.notes,
          h.nextDate ? `Next date: ${h.nextDate}` : '']
          .filter(Boolean).join('\n');
        // eslint-disable-next-line no-await-in-loop
        await caseHistoryService.create({
          caseId, hearingId: h.id, date: h.date, status: h.status || '',
          text: parts || h.purpose || 'Hearing', source: 'cause-list', createdAt: DateEngine.now(),
        });
        count += 1;
      }
      await caseActivityService.record(caseId, 'history.import', `Imported ${count} entr${count === 1 ? 'y' : 'ies'} from cause list`, user);
      return ok({ count });
    } catch (e) {
      return fail(e);
    }
  },
};

export default caseHistoryLogic;

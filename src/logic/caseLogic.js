import { caseService } from '@/services/caseService.js';
import { draftingService } from '@/services/draftingService.js';
import { citationService } from '@/services/citationService.js';
import { caseFolderLogic } from './caseFolderLogic.js';
import { caseHistoryService } from '@/services/caseHistoryService.js';
import { caseActivityService } from '@/services/caseActivityService.js';
import { reminderService } from '@/services/reminderService.js';
import { ok, fail } from '@/utils/result.js';
import { nowISO, uid } from '@/utils/id.js';

// caseLogic — case lifecycle + dashboard aggregation + vault assembly.
export const caseLogic = {
  list: (query) => caseService.listCases(query),
  get: (id) => caseService.getCase(id),

  async create(data, user) {
    const row = await caseService.createCase({ ...data, archived: false, watch: false, stageHistory: [], createdAt: nowISO() });
    await caseFolderLogic.ensureForCase(row.id);
    await caseActivityService.record(row.id, 'case.create', `Case created: ${row.caseNumber}`, user);
    return row;
  },

  async update(id, patch, user) {
    const before = await caseService.getCase(id);
    // Track stage changes into stageHistory.
    if (patch.stage && before && patch.stage !== before.stage) {
      const entry = {
        id: uid('sh'), from: before.stage || '—', to: patch.stage,
        by: user?.name || 'system', at: nowISO(), remarks: patch.stageRemarks || '',
      };
      patch = { ...patch, stageHistory: [entry, ...(before.stageHistory || [])] };
      await caseActivityService.record(id, 'stage.change', `Stage: ${entry.from} → ${entry.to}`, user);
    }
    delete patch.stageRemarks;
    const row = await caseService.updateCase(id, patch);
    await caseActivityService.record(id, 'case.update', 'Case updated', user);
    return row;
  },

  async remove(id, user) {
    await caseActivityService.record(id, 'case.delete', 'Case deleted', user);
    return caseService.deleteCase(id);
  },

  async bulkRemove(ids, user) {
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await caseService.deleteCase(id);
    }
    return ok({ count: ids.length });
  },

  async setArchived(id, archived, user) {
    await caseService.updateCase(id, { archived });
    await caseActivityService.record(id, archived ? 'case.archive' : 'case.restore', archived ? 'Case archived' : 'Case restored', user);
    return ok(true);
  },

  async toggleWatch(id, watch) {
    return ok(await caseService.updateCase(id, { watch }));
  },

  async duplicate(id, user) {
    const c = await caseService.getCase(id);
    if (!c) return fail('Case not found.');
    const { id: _drop, createdAt, updatedAt, ...rest } = c;
    const copy = await this.create({ ...rest, caseNumber: `${c.caseNumber} (Copy)`, watch: false, archived: false }, user);
    return ok(copy);
  },

  // Assemble the full case export (case + all related records).
  async exportBundle(id) {
    const [theCase, drafts, documents, hearings, notes, history, activity] = await Promise.all([
      caseService.getCase(id),
      draftingService.listDrafts(id),
      caseService.listDocuments(id),
      caseService.listHearings(id),
      caseService.listNotes(id),
      caseHistoryService.list(id),
      caseActivityService.list(id),
    ]);
    return { case: theCase, drafts, documents, hearings, notes, history, activity, exportedAt: nowISO() };
  },

  // Dashboard data aggregation across collections.
  async dashboard() {
    try {
      const [cases, drafts, documents, hearings] = await Promise.all([
        caseService.listCases(),
        draftingService.listDrafts(),
        caseService.listDocuments(),
        caseService.listHearings(),
      ]);
      const live = cases.filter((c) => !c.archived);
      const upcoming = hearings
        .filter((h) => new Date(h.date) >= startOfToday())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 6);
      let recentCitations = [];
      try { recentCitations = (await citationService.searchCases({ keywords: 'contract limitation title' })).slice(0, 4); }
      catch { recentCitations = []; }

      return ok({
        stats: {
          activeCases: live.filter((c) => c.status === 'Active').length,
          totalCases: live.length,
          drafts: drafts.length,
          documents: documents.length,
          hearings: upcoming.length,
        },
        activeCases: live.slice(0, 6),
        recentDrafts: [...drafts].sort(byUpdated).slice(0, 5),
        recentDocuments: [...documents].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 5),
        upcomingHearings: upcoming,
        recentCitations,
      });
    } catch (e) {
      return fail(e);
    }
  },

  // Case Vault — everything filed under one case.
  async vault(caseId) {
    try {
      const [theCase, drafts, documents, hearings, notes, folders, history, activity, reminders] = await Promise.all([
        caseService.getCase(caseId),
        draftingService.listDrafts(caseId),
        caseService.listDocuments(caseId),
        caseService.listHearings(caseId),
        caseService.listNotes(caseId),
        caseFolderLogic.list(caseId),
        caseHistoryService.list(caseId),
        caseActivityService.list(caseId),
        reminderService.list(caseId),
      ]);
      const sortedHearings = [...hearings].sort((a, b) => new Date(b.date) - new Date(a.date));
      const past = sortedHearings.filter((h) => new Date(h.date) <= new Date());
      return ok({
        case: theCase, drafts, documents, hearings, notes,
        folders, history, activity, reminders,
        lastHearing: past[0] || null,
      });
    } catch (e) {
      return fail(e);
    }
  },
};

function byUpdated(a, b) {
  return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
}
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default caseLogic;

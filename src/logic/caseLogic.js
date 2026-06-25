import { caseService } from '@/services/caseService.js';
import { draftingService } from '@/services/draftingService.js';
import { citationService } from '@/services/citationService.js';
import { caseFolderService } from '@/services/caseFolderService.js';
import { caseHistoryService } from '@/services/caseHistoryService.js';
import { caseActivityService } from '@/services/caseActivityService.js';
import { reminderService } from '@/services/reminderService.js';
import { ok, fail } from '@/utils/result.js';
import { nowISO, uid } from '@/utils/id.js';

function caseFolderName(data) {
  const ct = data.case_type || '';
  const cn = data.case_number;
  const cy = data.case_year;
  if (ct && cn != null && cy) return `${ct} ${cn}/${cy}`;
  return data.case_display_number || data.caseNumber || 'Miscellaneous';
}

// caseLogic — case lifecycle + dashboard aggregation + vault assembly.
export const caseLogic = {
  list: (query) => caseService.listCases(query),
  get: (id) => caseService.getCase(id),

  async create(data, user) {
    const enriched = { ...data };
    if (!enriched.case_display_number && enriched.case_type && enriched.case_number && enriched.case_year) {
      enriched.case_display_number = `${enriched.case_type} No. ${enriched.case_number} of ${enriched.case_year}`;
    }
    if (!enriched.caseNumber) enriched.caseNumber = enriched.case_display_number || '';
    if (!enriched.title && (enriched.plaintiff || enriched.defendant)) {
      enriched.title = [enriched.plaintiff, enriched.defendant].filter(Boolean).join(' vs ');
    }
    const row = await caseService.createCase({ ...enriched, archived: false, watch: false, stageHistory: [], createdAt: nowISO() });
    await caseFolderService.create({ caseId: row.id, name: caseFolderName(row), kind: 'document', order: 0, system: true, createdAt: nowISO() });
    await caseActivityService.record(row.id, 'case.create', `Case created: ${row.caseNumber}`, user);
    return row;
  },

  async update(id, patch, user) {
    const before = await caseService.getCase(id);
    const enriched = { ...patch };
    if (enriched.case_type || enriched.case_number !== undefined || enriched.case_year !== undefined) {
      const ct = enriched.case_type || before?.case_type || '';
      const cn = enriched.case_number ?? before?.case_number;
      const cy = enriched.case_year ?? before?.case_year;
      if (ct && cn != null && cy) {
        enriched.case_display_number = `${ct} No. ${cn} of ${cy}`;
        if (!enriched.caseNumber) enriched.caseNumber = enriched.case_display_number;
      }
    }
    if (enriched.plaintiff !== undefined || enriched.defendant !== undefined) {
      const pl = enriched.plaintiff ?? before?.plaintiff ?? '';
      const df = enriched.defendant ?? before?.defendant ?? '';
      if (pl || df) enriched.title = [pl, df].filter(Boolean).join(' vs ');
    }
    if (enriched.stage && before && enriched.stage !== before.stage) {
      const entry = {
        id: uid('sh'), from: before.stage || '—', to: enriched.stage,
        by: user?.name || 'system', at: nowISO(), remarks: enriched.stageRemarks || '',
      };
      enriched.stageHistory = [entry, ...(before.stageHistory || [])];
      delete enriched.stageRemarks;
      await caseActivityService.record(id, 'stage.change', `Stage: ${entry.from} → ${entry.to}`, user);
    }
    delete enriched.stageRemarks;
    const row = await caseService.updateCase(id, enriched);
    await caseActivityService.record(id, 'case.update', 'Case updated', user);
    return row;
  },

  async remove(id, user, deleteFolders) {
    if (deleteFolders) {
      const folders = await caseFolderService.list(id);
      for (const f of folders) {
        await caseFolderService.remove(f.id);
      }
    }
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

      /* case type distribution from live cases */
      const typeMap = {};
      for (const c of live) { const t = c.case_type || 'Other'; typeMap[t] = (typeMap[t] || 0) + 1; }
      const caseTypeDistribution = Object.entries(typeMap).map(([label, value]) => ({ label, value }));

      const onHoldCnt = live.filter((c) => c.status === 'On Hold').length;
      const draftCnt = drafts.length;

      return ok({
        stats: {
          activeCases: live.filter((c) => c.status === 'Active').length,
          totalCases: live.length,
          onHoldCases: onHoldCnt,
          drafts: draftCnt,
          documents: documents.length,
          hearings: upcoming.length,
        },
        activeCases: live.slice(0, 6),
        recentDrafts: [...drafts].sort(byUpdated).slice(0, 5),
        recentDocuments: [...documents].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 5),
        upcomingHearings: upcoming,
        recentCitations,
        caseTypeDistribution,
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
        caseFolderService.list(caseId),
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

import { caseService } from '@/services/caseService.js';
import { draftingService } from '@/services/draftingService.js';
import { citationService } from '@/services/citationService.js';
import { caseFolderService } from '@/services/caseFolderService.js';
import { caseFolderLogic } from '@/logic/caseFolderLogic.js';
import { caseHistoryService } from '@/services/caseHistoryService.js';
import { caseActivityService } from '@/services/caseActivityService.js';
import { reminderService } from '@/services/reminderService.js';
import { reminderLogic } from '@/logic/reminderLogic.js';
import { draftsRepository } from '@/data-layer/repositories/draftsRepository.js';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { invalidateQuery } from '@/data-layer/queryCache.js';
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
    if (row.nextHearing) await reminderLogic.syncHearingReminders(row.id, user).catch(() => {});
    invalidateQuery('dashboard');
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
    const touchedHearing = 'next_hearing' in patch || 'nextHearing' in patch || 'status' in patch;
    if (touchedHearing) await reminderLogic.syncHearingReminders(id, user).catch(() => {});
    invalidateQuery('dashboard');
    return row;
  },

  async remove(id, user, deleteFolders) {
    if (deleteFolders) {
      const folders = await caseFolderService.list(id);
      await Promise.all(folders.map((f) => caseFolderLogic.remove(f, {}, user)));
    }
    await caseActivityService.record(id, 'case.delete', 'Case deleted', user);
    return caseService.deleteCase(id);
  },

  async bulkRemove(ids, user) {
    await Promise.all(ids.map(async (id) => {
      const folders = await caseFolderService.list(id);
      await Promise.all(folders.map((f) => caseFolderLogic.remove(f, {}, user)));
      await caseService.deleteCase(id);
    }));
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
      const [
        cases, draftCount, drafts, docCount, documents, hearings, tasks,
      ] = await Promise.all([
        caseService.listCases({ select: 'id,status,case_type,title,case_number,case_number_str,case_display_number,case_year,next_hearing,archived,client,created_at,updated_at' }).catch(() => []),
        draftsRepository.count().catch(() => 0),
        draftsRepository.getAll({ limit: 5, order: 'updated_at.desc' }).catch(() => []),
        documentsRepository.count().catch(() => 0),
        documentsRepository.getAll({ limit: 5, order: 'uploaded_at.desc' }).catch(() => []),
        caseService.listHearings().catch(() => []),
        (async () => { try { const m = await import('@/logic/taskLogic.js'); const r = await m.taskLogic.list(); return r.ok ? r.data || [] : []; } catch { return []; } })(),
      ]);
      const live = cases.filter((c) => !c.archived);

      // Ensure automatic hearing reminders exist for every case that currently
      // has an upcoming next-hearing date. syncHearingReminders is idempotent —
      // it only writes when reminders are missing/stale — so this reconciles
      // cases whose hearing dates were set before the reminder feature existed
      // (or from other entry points) without ever creating duplicates.
      const syncable = live.filter((c) => {
        const s = String(c?.status || '').toLowerCase();
        if (['disposed', 'cancelled', 'canceled', 'closed', 'dismissed', 'archived', 'completed'].includes(s)) return false;
        if (!c.nextHearing) return false;
        const x = new Date(c.nextHearing);
        return !Number.isNaN(x.getTime());
      });
      await Promise.all(syncable.map((c) => reminderLogic.syncHearingReminders(c.id).catch(() => {})));
      const reminders = await reminderService.list().catch(() => []);
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const isFuture = (d) => {
        if (!d) return false;
        const x = new Date(d); if (Number.isNaN(x.getTime())) return false;
        x.setHours(0, 0, 0, 0);
        return x >= now;
      };
      const caseMap = Object.fromEntries(cases.map((c) => [c.id, c]));
      const fmtNumber = (c) => {
        if (!c) return '—';
        const ct = c.case_type || '';
        const cn = c.case_number || '';
        const cy = c.case_year || '';
        if (ct && cn && cy) return `${ct} No. ${cn} of ${cy}`;
        return c.case_display_number || c.caseNumber || '—';
      };
      // Future hearing records (order-sheet entries dated in the future).
      const futureHearings = hearings
        .filter((h) => isFuture(h.date))
        .map((h) => {
          const cid = h.caseId || h.case_id;
          const c = caseMap[cid];
          return {
            id: `hearing-${h.id}`, caseId: cid,
            caseTitle: c?.title || h.caseTitle || h.parties || '—',
            caseNumber: fmtNumber(c) || h.caseNumber || '—',
            date: h.date, time: h.time, purpose: h.purpose || 'Hearing',
            status: h.status || 'Scheduled',
          };
        });
      const seen = new Set(futureHearings.map((h) => `${h.caseId}|${(h.date || '').slice(0, 10)}`));
      // Each live case's next hearing date (the canonical upcoming hearing).
      const caseNext = live
        .filter((c) => isFuture(c.nextHearing))
        .filter((c) => !seen.has(`${c.id}|${(c.nextHearing || '').slice(0, 10)}`))
        .map((c) => ({ id: `next-${c.id}`, caseId: c.id, caseTitle: c.title, caseNumber: fmtNumber(c), date: c.nextHearing, purpose: 'Next Hearing', status: 'Scheduled' }));
      const upcoming = [...futureHearings, ...caseNext]
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .slice(0, 6);

      /* Upcoming reminders: pending notifications whose trigger date has arrived
         or is still ahead. Show the nearest-firing reminder per case so the
         dashboard stays a concise summary; the full list lives on the case. */
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const dayMs = 86400000;
      const activeReminders = (reminders || [])
        .filter((r) => !r.done && r.status !== 'completed' && r.status !== 'dismissed')
        .map((r) => ({ raw: r, triggerTs: new Date(r.date).setHours(0, 0, 0, 0) }))
        .filter((x) => !Number.isNaN(x.triggerTs))
        .sort((a, b) => a.triggerTs - b.triggerTs);

      const byCaseNearest = new Map();
      for (const x of activeReminders) {
        const cid = x.raw.caseId || x.raw.case_id || x.raw.id;
        if (!byCaseNearest.has(cid)) byCaseNearest.set(cid, x);
      }

      const upcomingReminders = [...byCaseNearest.values()]
        .sort((a, b) => a.triggerTs - b.triggerTs)
        .slice(0, 8)
        .map(({ raw, triggerTs }) => {
          const cid = raw.caseId || raw.case_id;
          const c = caseMap[cid];
          const hearingTs = raw.dueAt ? new Date(raw.dueAt).setHours(0, 0, 0, 0) : triggerTs;
          const daysLeft = Math.max(0, Math.round((hearingTs - today.getTime()) / dayMs));
          return {
            id: raw.id,
            title: raw.title,
            type: raw.type || 'Reminder',
            date: raw.dueAt || raw.date,
            triggerDate: raw.date,
            caseId: cid,
            caseTitle: c?.title || c?.case_display_number || c?.caseNumber || '—',
            daysLeft,
          };
        });

      /* Upcoming tasks: active, non-archived tasks with a due date that is today
         or in the future, nearest-due first. Reuses the same tasks collection the
         Calendar page reads — no duplicated data store. */
      const upcomingTasks = (tasks || [])
        .filter((t) => !t.archived && t.active !== false && t.status !== 'Completed' && t.due_date)
        .map((t) => {
          const dueTs = new Date(t.due_date).setHours(0, 0, 0, 0);
          const daysLeft = Math.round((dueTs - today.getTime()) / dayMs);
          const c = caseMap[t.case_id];
          return {
            id: t.id,
            title: t.title,
            category: t.category || 'Task',
            status: t.status,
            priority: t.priority,
            color: t.color || '#6b7280',
            date: t.due_date,
            dueTime: t.due_time || null,
            caseId: t.case_id || null,
            caseTitle: c?.title || c?.case_display_number || c?.caseNumber || null,
            daysLeft,
          };
        })
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .slice(0, 6);
      let recentCitations = [];
      try { recentCitations = (await citationService.searchCases({ keywords: 'contract limitation title' })).slice(0, 4); }
      catch { recentCitations = []; }

      /* case type distribution from live cases */
      const typeMap = {};
      for (const c of live) { const t = c.case_type || 'Other'; typeMap[t] = (typeMap[t] || 0) + 1; }
      const caseTypeDistribution = Object.entries(typeMap).map(([label, value]) => ({ label, value }));

      const onHoldCnt = live.filter((c) => c.status === 'On Hold').length;

      const allTasks = tasks || [];
      const activeTasks = allTasks.filter((t) => !t.archived);
      return ok({
        stats: {
          activeCases: live.filter((c) => c.status === 'Active').length,
          totalCases: live.length,
          onHoldCases: onHoldCnt,
          drafts: draftCount ?? drafts.length,
          documents: docCount ?? documents.length,
          hearings: upcoming.length,
          activeTasks: activeTasks.filter((t) => t.status !== 'Completed').length,
          taskPending: activeTasks.filter((t) => t.status === 'Pending' || !t.status).length,
          taskInProgress: activeTasks.filter((t) => t.status === 'In Progress').length,
          taskCompleted: activeTasks.filter((t) => t.status === 'Completed').length,
          taskCancelled: activeTasks.filter((t) => t.status === 'Cancelled').length,
          taskOnHold: activeTasks.filter((t) => t.status === 'On Hold').length,
        },
        activeCases: live.slice(0, 6),
        recentDrafts: [...drafts].sort(byUpdated).slice(0, 5),
        recentDocuments: [...documents].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 5),
        upcomingHearings: upcoming,
        upcomingReminders,
        upcomingTasks,
        recentCitations,
        caseTypeDistribution,
      });
    } catch (e) {
      return fail(e);
    }
  },

  // Manage Cases — everything filed under one case.
  // Lazy-loaded per tab to avoid fetching all related data on page mount.
  async vault(caseId) {
    try { return ok({ case: await caseService.getCase(caseId) }); } catch (e) { return fail(e); }
  },

  // Per-tab lazy loaders
  async vaultHearings(caseId) {
    try {
      const hearings = await caseService.listHearings(caseId);
      const sorted = [...hearings].sort((a, b) => new Date(b.date) - new Date(a.date));
      const past = sorted.filter((h) => new Date(h.date) <= new Date());
      return ok({ hearings, lastHearing: past[0] || null });
    } catch (e) { return fail(e); }
  },
  async vaultDrafts(caseId) { try { return ok(await draftingService.listDrafts(caseId)); } catch (e) { return fail(e); } },
  async vaultDocuments(caseId) { try { return ok(await caseService.listDocuments(caseId)); } catch (e) { return fail(e); } },
  async vaultNotes(caseId) { try { return ok(await caseService.listNotes(caseId)); } catch (e) { return fail(e); } },
  async vaultFolders(caseId) { try { return ok(await caseFolderService.list(caseId)); } catch (e) { return fail(e); } },
  async vaultHistory(caseId) { try { return ok(await caseHistoryService.list(caseId)); } catch (e) { return fail(e); } },
  async vaultActivity(caseId) { try { return ok(await caseActivityService.list(caseId)); } catch (e) { return fail(e); } },
  async vaultReminders(caseId) { try { return ok(await reminderService.list(caseId)); } catch (e) { return fail(e); } },
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

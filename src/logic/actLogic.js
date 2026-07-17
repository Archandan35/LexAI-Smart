import { actService } from '@/services/actService.js';
import { ok, fail } from '@/utils/result.js';
import { nowISO, uid } from '@/utils/id.js';

export const actLogic = {
  async list() {
    const rows = await actService.list();
    return [...rows].sort((a, b) => a.title?.localeCompare?.(b.title) || 0);
  },

  async get(id) {
    try {
      const row = await actService.get(id);
      return row ? ok(row) : fail('Act not found.');
    } catch (e) {
      return fail(e);
    }
  },

  async create(data) {
    try {
      const { name, ...rest } = data;
      const row = await actService.create({
        ...rest,
        title: rest.title || name || '',
        id: uid('act'), created_at: nowISO(),
      });
      return ok(row);
    } catch (e) {
      return fail(e);
    }
  },

  async update(id, data) {
    try {
      const row = await actService.update(id, data);
      return ok(row);
    } catch (e) {
      return fail(e);
    }
  },

  async remove(id) {
    try {
      await actService.remove(id);
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  },

  async stats() {
    try {
      const rows = await actService.list();
      const total = rows.length;
      const totalSections = rows.reduce((s, a) => s + (a.sections_count || 0), 0);
      const totalAmendments = rows.reduce((s, a) => s + (a.amendments_count || 0), 0);
      const dates = rows.map((a) => a.updated_at || a.created_at).filter(Boolean).sort().reverse();
      return { totalActs: total, totalSections, totalAmendments, lastUpdated: dates[0] || '—' };
    } catch (e) {
      return {};
    }
  },
};

export default actLogic;

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
      const row = await actService.create({ ...data, id: uid('act'), created_at: nowISO() });
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
};

export default actLogic;

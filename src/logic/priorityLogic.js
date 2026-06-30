import { priorityService } from '@/services/priorityService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

export const priorityLogic = {
  async list() {
    try {
      const rows = await priorityService.list();
      return [...rows].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    } catch (err) { return fail(err); }
  },

  async create(data) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Priority name is required.');
      return ok(await priorityService.create({ name, display_order: data.display_order ?? 0, color: data.color || '#6b7280', status: 'Active', createdAt: nowISO() }));
    } catch (err) { return fail(err); }
  },

  async update(id, data) {
    try {
      return ok(await priorityService.update(id, { name: data.name, display_order: data.display_order, color: data.color, status: data.status }));
    } catch (err) { return fail(err); }
  },

  async remove(id) {
    try { return ok(await priorityService.remove(id)); }
    catch (err) { return fail(err); }
  },

  async reorder(orderedIds) {
    try {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await priorityService.update(orderedIds[i], { display_order: i });
      }
      return ok(true);
    } catch (err) { return fail(err); }
  },
};

export default priorityLogic;

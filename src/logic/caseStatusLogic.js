import { caseStatusService } from '@/services/caseStatusService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

export const caseStatusLogic = {
  async list() {
    try {
      const rows = await caseStatusService.list();
      return [...rows].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    } catch (err) { return fail(err); }
  },

  async create(data) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Status name is required.');
      return ok(await caseStatusService.create({ name, display_order: data.display_order ?? 0, status: 'Active', createdAt: nowISO() }));
    } catch (err) { return fail(err); }
  },

  async update(id, data) {
    try {
      return ok(await caseStatusService.update(id, { name: data.name, display_order: data.display_order, status: data.status }));
    } catch (err) { return fail(err); }
  },

  async remove(id) {
    try { return ok(await caseStatusService.remove(id)); }
    catch (err) { return fail(err); }
  },

  async reorder(orderedIds) {
    try {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await caseStatusService.update(orderedIds[i], { display_order: i });
      }
      return ok(true);
    } catch (err) { return fail(err); }
  },
};

export default caseStatusLogic;

import { courtsService } from '@/services/courtsService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

export const courtsLogic = {
  async list() {
    try {
      const rows = await courtsService.list();
      return [...rows].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    } catch (err) { return fail(err); }
  },

  async get(id) {
    try {
      return courtsService.get(id);
    } catch (err) { return fail(err); }
  },

  async create(data) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Court name is required.');
      return ok(await courtsService.create({
        name,
        level: data.level ?? 1,
        parent_id: data.parent_id || null,
        display_order: data.display_order ?? 0,
        status: 'Active',
        createdAt: nowISO(),
      }));
    } catch (err) { return fail(err); }
  },

  async update(id, data) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Court name is required.');
      return ok(await courtsService.update(id, {
        name,
        level: data.level,
        parent_id: data.parent_id || null,
        display_order: data.display_order,
        status: data.status,
      }));
    } catch (err) { return fail(err); }
  },

  async remove(id) {
    try {
      return ok(await courtsService.remove(id));
    } catch (err) { return fail(err); }
  },
};

export default courtsLogic;

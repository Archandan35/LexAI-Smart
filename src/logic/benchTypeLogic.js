import { benchTypeService } from '@/services/benchTypeService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

export const benchTypeLogic = {
  async list() {
    try {
      const rows = await benchTypeService.list();
      return [...rows].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    } catch (err) { return fail(err); }
  },

  async get(id) {
    try {
      return benchTypeService.get(id);
    } catch (err) { return fail(err); }
  },

  async create(data) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Bench type name is required.');
      return ok(await benchTypeService.create({
        name,
        short_code: (data.short_code || '').trim().toUpperCase(),
        description: (data.description || '').trim(),
        display_order: data.display_order ?? 0,
        status: 'Active',
        createdAt: nowISO(),
      }));
    } catch (err) { return fail(err); }
  },

  async update(id, data) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Bench type name is required.');
      return ok(await benchTypeService.update(id, {
        name,
        short_code: (data.short_code || '').trim().toUpperCase(),
        description: (data.description || '').trim(),
        display_order: data.display_order,
        status: data.status,
      }));
    } catch (err) { return fail(err); }
  },

  async remove(id) {
    try {
      return ok(await benchTypeService.remove(id));
    } catch (err) { return fail(err); }
  },
};

export default benchTypeLogic;

import { judgeService } from '@/services/judgeService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

export const judgeLogic = {
  async list() {
    try {
      const rows = await judgeService.list();
      return [...rows].sort((a, b) => a.name?.localeCompare(b.name));
    } catch (err) { return fail(err); }
  },

  async get(id) {
    try {
      return judgeService.get(id);
    } catch (err) { return fail(err); }
  },

  async create(data) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Judge name is required.');
      return ok(await judgeService.create({
        name,
        short_code: (data.short_code || '').trim().toUpperCase(),
        designation: (data.designation || '').trim(),
        court: (data.court || '').trim(),
        status: 'Active',
        createdAt: nowISO(),
      }));
    } catch (err) { return fail(err); }
  },

  async update(id, data) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Judge name is required.');
      return ok(await judgeService.update(id, {
        name,
        short_code: (data.short_code || '').trim().toUpperCase(),
        designation: (data.designation || '').trim(),
        court: (data.court || '').trim(),
        status: data.status,
      }));
    } catch (err) { return fail(err); }
  },

  async remove(id) {
    try {
      return ok(await judgeService.remove(id));
    } catch (err) { return fail(err); }
  },
};

export default judgeLogic;

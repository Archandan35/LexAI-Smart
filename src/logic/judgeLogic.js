import { judgeService } from '@/services/judgeService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

const SHORT_CODE_PREFIX = 'JUDG';

function autoShortCode(name = '') {
  const slug = String(name).trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
  return slug ? `${SHORT_CODE_PREFIX}-${slug}` : '';
}

export const judgeLogic = {
  async list() {
    try {
      const rows = await judgeService.list();
      return [...rows].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
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
        short_code: (data.short_code || '').trim().toUpperCase() || autoShortCode(name),
        designation: (data.designation || '').trim(),
        court: (data.court || '').trim(),
        status: data.status || 'Active',
        display_order: data.display_order ?? 0,
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
        short_code: (data.short_code || '').trim().toUpperCase() || autoShortCode(name),
        designation: (data.designation || '').trim(),
        court: (data.court || '').trim(),
        status: data.status,
        display_order: data.display_order,
      }));
    } catch (err) { return fail(err); }
  },

  async remove(id) {
    try {
      return ok(await judgeService.remove(id));
    } catch (err) { return fail(err); }
  },

  async reorder(orderedIds) {
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        await judgeService.update(orderedIds[i], { display_order: i });
      }
      return ok('Reordered');
    } catch (err) { return fail(err); }
  },
};

export default judgeLogic;

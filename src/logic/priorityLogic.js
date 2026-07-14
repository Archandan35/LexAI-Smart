import { priorityService } from '@/services/priorityService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';
import { orderComparator, nextDisplayOrder, normalizeDisplayOrder } from '@/utils/displayOrder.js';

const SHORT_CODE_PREFIX = 'PRIT';

function autoShortCode(name = '') {
  const slug = String(name).trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
  return slug ? `${SHORT_CODE_PREFIX}-${slug}` : '';
}

export const priorityLogic = {
  async list() {
    try {
      const rows = await priorityService.list();
      return [...rows].sort(orderComparator);
    } catch (err) { return fail(err); }
  },

  async normalizeOrder() {
    const rows = await priorityService.list();
    return normalizeDisplayOrder(rows, (id, patch) => priorityService.update(id, patch));
  },

  async create(data) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Priority name is required.');
      const rows = await priorityService.list();
      return ok(await priorityService.create({ name, short_code: (data.short_code || '').trim().toUpperCase() || autoShortCode(name), display_order: data.display_order ?? nextDisplayOrder(rows), color: data.color || '#6b7280', status: data.status || 'Active', description: data.description, createdAt: nowISO() }));
    } catch (err) { return fail(err); }
  },

  async update(id, data) {
    try {
      const patch = {};
      if (data.name !== undefined) {
        const name = (data.name || '').trim();
        if (!name) return fail('Priority name is required.');
        patch.name = name;
      }
      if (data.short_code !== undefined) patch.short_code = (data.short_code || '').trim().toUpperCase();
      if (data.description !== undefined) patch.description = (data.description || '').trim();
      if (data.display_order !== undefined) patch.display_order = data.display_order;
      if (data.color !== undefined) patch.color = data.color;
      if (data.status !== undefined) patch.status = data.status || 'Active';
      return ok(await priorityService.update(id, patch));
    } catch (err) { return fail(err); }
  },

  async remove(id) {
    try { return ok(await priorityService.remove(id)); }
    catch (err) { return fail(err); }
  },

  async reorder(orderedIds) {
    try {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await priorityService.update(orderedIds[i], { display_order: i + 1 });
      }
      return ok(true);
    } catch (err) { return fail(err); }
  },
};

export default priorityLogic;

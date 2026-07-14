import { jurisdictionService } from '@/services/jurisdictionService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';
import { orderComparator, nextDisplayOrder, normalizeDisplayOrder } from '@/utils/displayOrder.js';

const SHORT_CODE_PREFIX = 'JURT';

function autoShortCode(name = '') {
  const slug = String(name).trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
  return slug ? `${SHORT_CODE_PREFIX}-${slug}` : '';
}

export const jurisdictionLogic = {
  async list() {
    try {
      const rows = await jurisdictionService.list();
      return [...rows].sort(orderComparator);
    } catch (err) { return fail(err); }
  },

  async normalizeOrder() {
    const rows = await jurisdictionService.list();
    return normalizeDisplayOrder(rows, (id, patch) => jurisdictionService.update(id, patch));
  },

  async get(id) {
    try {
      return jurisdictionService.get(id);
    } catch (err) { return fail(err); }
  },

  async create(data) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Jurisdiction name is required.');
      const rows = await jurisdictionService.list();
      return ok(await jurisdictionService.create({
        name,
        short_code: (data.short_code || '').trim().toUpperCase() || autoShortCode(name),
        description: (data.description || '').trim(),
        display_order: data.display_order ?? nextDisplayOrder(rows),
        color: data.color || '#6b7280',
        status: data.status || 'Active',
        createdAt: nowISO(),
      }));
    } catch (err) { return fail(err); }
  },

  async update(id, data) {
    try {
      const patch = {};
      if (data.name !== undefined) {
        const name = (data.name || '').trim();
        if (!name) return fail('Jurisdiction name is required.');
        patch.name = name;
      }
      if (data.short_code !== undefined) patch.short_code = (data.short_code || '').trim().toUpperCase();
      if (data.description !== undefined) patch.description = (data.description || '').trim();
      if (data.display_order !== undefined) patch.display_order = data.display_order;
      if (data.color !== undefined) patch.color = data.color;
      if (data.status !== undefined) patch.status = data.status || 'Active';
      return ok(await jurisdictionService.update(id, patch));
    } catch (err) { return fail(err); }
  },

  async remove(id) {
    try {
      return ok(await jurisdictionService.remove(id));
    } catch (err) { return fail(err); }
  },

  async reorder(orderedIds) {
    try {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await jurisdictionService.update(orderedIds[i], { display_order: i + 1 });
      }
      return ok(true);
    } catch (err) { return fail(err); }
  },
};

export default jurisdictionLogic;

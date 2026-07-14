import { partyTypeService } from '@/services/partyTypeService.js';
import { ok, fail } from '@/utils/result.js';
import { nowISO, uid } from '@/utils/id.js';
import { orderComparator, nextDisplayOrder, normalizeDisplayOrder } from '@/utils/displayOrder.js';

const SHORT_CODE_PREFIX = 'PART';

function autoShortCode(name = '') {
  const slug = String(name).trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
  return slug ? `${SHORT_CODE_PREFIX}-${slug}` : '';
}

export const partyTypeLogic = {
  async list() {
    const rows = await partyTypeService.list();
    return [...rows].sort(orderComparator);
  },

  async normalizeOrder() {
    const rows = await partyTypeService.list();
    return normalizeDisplayOrder(rows, (id, patch) => partyTypeService.update(id, patch));
  },

  async create(data) {
    try {
      const name = (data.name || '').trim();
      const rows = await partyTypeService.list();
      const row = await partyTypeService.create({
        ...data, name,
        short_code: (data.short_code || '').trim().toUpperCase() || autoShortCode(name),
        display_order: data.display_order ?? nextDisplayOrder(rows),
        id: uid('pty'), created_at: nowISO(),
      });
      return ok(row);
    } catch (e) {
      return fail(e);
    }
  },

  async update(id, data) {
    try {
      const patch = {};
      if (data.name !== undefined) {
        const name = (data.name || '').trim();
        if (!name) return fail('Party type name is required.');
        patch.name = name;
      }
      if (data.short_code !== undefined) patch.short_code = (data.short_code || '').trim().toUpperCase();
      if (data.description !== undefined) patch.description = (data.description || '').trim();
      if (data.display_order !== undefined) patch.display_order = data.display_order;
      if (data.color !== undefined) patch.color = data.color;
      if (data.status !== undefined) patch.status = data.status || 'Active';
      const row = await partyTypeService.update(id, patch);
      return ok(row);
    } catch (e) {
      return fail(e);
    }
  },

  async remove(id) {
    try {
      await partyTypeService.remove(id);
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  },

  async reorder(ids) {
    try {
      for (let i = 0; i < ids.length; i++) {
        await partyTypeService.update(ids[i], { display_order: i + 1 });
      }
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  },

  async setStatus(id, status) {
    try {
      const row = await partyTypeService.update(id, { status, updated_at: nowISO() });
      return ok(row);
    } catch (e) {
      return fail(e);
    }
  },

  async bulkCreate(records) {
    try {
      const rows = records.map((r) => ({ ...r, id: uid('pty'), created_at: nowISO() }));
      await partyTypeService.bulkCreate(rows);
      return ok(rows);
    } catch (e) {
      return fail(e);
    }
  },

  async bulkRemove(ids) {
    try {
      await partyTypeService.bulkDelete(ids);
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  },
};

export default partyTypeLogic;

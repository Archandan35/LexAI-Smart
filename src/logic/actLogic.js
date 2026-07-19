import { actService } from '@/services/actService.js';
import { ok, fail } from '@/utils/result.js';
import { nowISO, uid } from '@/utils/id.js';
import { orderComparator, normalizeDisplayOrder, nextDisplayOrder } from '@/utils/displayOrder.js';

const SHORT_CODE_PREFIX = 'ACTY';

function autoShortCode(title = '') {
  const slug = String(title).trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
  return slug ? `${SHORT_CODE_PREFIX}-${slug}` : '';
}

export const actLogic = {
  async list() {
    const rows = await actService.list();
    return [...rows].sort(orderComparator).map((r) => ({ ...r, name: r.title || r.name || '' }));
  },

  async normalizeOrder() {
    const rows = await actService.list();
    return normalizeDisplayOrder(rows, (id, patch) => actService.update(id, patch));
  },

  async get(id) {
    try {
      const row = await actService.get(id);
      return row ? ok(row) : fail('Act not found.');
    } catch (e) {
      return fail(e);
    }
  },

  async reorder(orderedIds) {
    try {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await actService.update(orderedIds[i], { display_order: i + 1 });
      }
      return ok(true);
    } catch (err) { return fail(err); }
  },

  async create(data) {
    try {
      const { name, ...rest } = data;
      const title = rest.title || name || '';
      const all = await actService.list();
      const row = await actService.create({
        ...rest,
        title,
        short_code: (data.short_code || '').trim().toUpperCase() || autoShortCode(title),
        id: uid('act'), created_at: nowISO(), display_order: nextDisplayOrder(all),
      });
      return ok(row);
    } catch (e) {
      return fail(e);
    }
  },

  async update(id, data) {
    try {
      if (data.short_code !== undefined) data.short_code = (data.short_code || '').trim().toUpperCase();
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

  async stats() {
    try {
      const rows = await actService.list();
      const total = rows.length;
      const totalSections = rows.reduce((s, a) => s + (a.sections_count || 0), 0);
      const totalAmendments = rows.reduce((s, a) => s + (a.amendments_count || 0), 0);
      const dates = rows.map((a) => a.updated_at || a.created_at).filter(Boolean).sort().reverse();
      return { totalActs: total, totalSections, totalAmendments, lastUpdated: dates[0] || '—' };
    } catch (e) {
      return {};
    }
  },
};

export default actLogic;

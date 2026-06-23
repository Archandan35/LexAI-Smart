import { caseTypeService } from '@/services/caseTypeService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

export const caseTypeLogic = {
  async list() {
    try {
      const rows = await caseTypeService.list();
      return [...rows].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    } catch (err) { return fail(err); }
  },

  async get(id) {
    try {
      return caseTypeService.get(id);
    } catch (err) { return fail(err); }
  },

  async create(data) {
    try {
      const name = (data.name || '').trim();
      const shortCode = (data.short_code || '').trim();
      if (!name) return fail('Case type name is required.');
      if (!shortCode) return fail('Short code is required.');
      const existing = await caseTypeService.list();
      if (existing.some((t) => t.short_code.toLowerCase() === shortCode.toLowerCase())) {
        return fail(`A case type with short code "${shortCode}" already exists.`);
      }
      const order = existing.reduce((m, t) => Math.max(m, t.display_order ?? 0), 0) + 1;
      return ok(await caseTypeService.create({
        name,
        short_code: shortCode,
        display_order: order,
        status: 'Active',
        createdAt: nowISO(),
      }));
    } catch (err) { return fail(err); }
  },

  async update(id, data) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Case type name is required.');
      return ok(await caseTypeService.update(id, {
        name,
        short_code: data.short_code,
        display_order: data.display_order,
        status: data.status,
      }));
    } catch (err) { return fail(err); }
  },

  async remove(id) {
    try {
      return ok(await caseTypeService.remove(id));
    } catch (err) { return fail(err); }
  },

  async reorder(orderedIds) {
    try {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await caseTypeService.update(orderedIds[i], { display_order: i });
      }
      return ok(true);
    } catch (err) { return fail(err); }
  },

  async setStatus(id, status) {
    try {
      return ok(await caseTypeService.update(id, { status }));
    } catch (err) { return fail(err); }
  },

  async bulkCreate(records) {
    try {
      const existing = await caseTypeService.list();
      const existingCodes = new Set(existing.map((t) => t.short_code.toLowerCase()));
      let maxOrder = existing.reduce((m, t) => Math.max(m, t.display_order ?? 0), 0);

      const pending = records.map((r) => {
        const name = (r.name || '').trim();
        const shortCode = (r.short_code || '').trim();
        if (!name || !shortCode) return null;
        if (existingCodes.has(shortCode.toLowerCase())) return null;
        existingCodes.add(shortCode.toLowerCase());
        maxOrder += 1;
        return { name, short_code: shortCode, display_order: maxOrder, status: 'Active', createdAt: nowISO() };
      }).filter(Boolean);

      if (!pending.length) return ok({ count: 0, items: [] });

      const created = [];
      const batchSize = 5;
      for (let i = 0; i < pending.length; i += batchSize) {
        const batch = pending.slice(i, i + batchSize);
        await Promise.all(batch.map((d) => caseTypeService.create(d).then((item) => created.push(item)).catch(() => {})));
      }
      return ok({ count: created.length, items: created });
    } catch (err) { return fail(err); }
  },

  async bulkRemove(ids) {
    try {
      let deleted = 0;
      const batchSize = 5;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        await Promise.all(batch.map((id) => caseTypeService.remove(id).then(() => { deleted += 1; }).catch(() => {})));
      }
      return ok({ deleted, failed: ids.length - deleted });
    } catch (err) { return fail(err); }
  },
};

export default caseTypeLogic;

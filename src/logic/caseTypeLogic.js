import { caseTypeService } from '@/services/caseTypeService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

export const caseTypeLogic = {
  async list() {
    const rows = await caseTypeService.list();
    return [...rows].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  },

  async get(id) {
    return caseTypeService.get(id);
  },

  async create(data) {
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
  },

  async update(id, data) {
    const name = (data.name || '').trim();
    if (!name) return fail('Case type name is required.');
    return ok(await caseTypeService.update(id, {
      name,
      short_code: data.short_code,
      display_order: data.display_order,
      status: data.status,
    }));
  },

  async remove(id) {
    return ok(await caseTypeService.remove(id));
  },

  async reorder(orderedIds) {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await caseTypeService.update(orderedIds[i], { display_order: i });
    }
    return ok(true);
  },

  async setStatus(id, status) {
    return ok(await caseTypeService.update(id, { status }));
  },

  async bulkCreate(records) {
    const created = [];
    for (const r of records) {
      const res = await this.create(r);
      if (res.ok) created.push(res.data);
    }
    return ok({ count: created.length, items: created });
  },

  async bulkRemove(ids) {
    let deleted = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await caseTypeService.remove(id);
        deleted += 1;
      } catch {
        failed += 1;
      }
    }
    return ok({ deleted, failed });
  },
};

export default caseTypeLogic;

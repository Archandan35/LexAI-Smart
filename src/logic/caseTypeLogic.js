import { caseTypeService } from '@/services/caseTypeService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

const SHORT_CODE_PREFIX = 'CAST';

function autoShortCode(name = '') {
  const slug = String(name).trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
  return slug ? `${SHORT_CODE_PREFIX}-${slug}` : '';
}

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
      let shortCode = (data.short_code || '').trim();
      if (!name) return fail('Case type name is required.');
      if (!shortCode) shortCode = autoShortCode(name);
      if (!shortCode) return fail('Short code is required.');
      const existing = await caseTypeService.list();
      if (existing.some((t) => t.short_code.toLowerCase() === shortCode.toLowerCase())) {
        return fail(`A case type with short code "${shortCode}" already exists.`);
      }
      if (existing.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
        return fail(`A case type with name "${name}" already exists.`);
      }
      const order = existing.reduce((m, t) => Math.max(m, t.display_order ?? 0), 0) + 1;
      return ok(await caseTypeService.create({
        name,
        short_code: shortCode,
        display_order: order,
        color: data.color || '#6b7280',
        status: 'Active',
        createdAt: nowISO(),
      }));
    } catch (err) { return fail(err); }
  },

  async update(id, data) {
    try {
      const patch = {};
      let name;
      if (data.name !== undefined) {
        name = (data.name || '').trim();
        if (!name) return fail('Case type name is required.');
        patch.name = name;
      }
      if (data.short_code !== undefined) patch.short_code = (data.short_code || '').trim();
      if (data.description !== undefined) patch.description = (data.description || '').trim();
      if (data.display_order !== undefined) patch.display_order = data.display_order;
      if (data.color !== undefined) patch.color = data.color;
      if (data.status !== undefined) patch.status = data.status || 'Active';

      if (name !== undefined) {
        const existing = await caseTypeService.list();
        if (existing.some((t) => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) {
          return fail(`A case type with name "${name}" already exists.`);
        }
        const shortCode = patch.short_code || autoShortCode(name);
        if (shortCode && existing.some((t) => t.id !== id && t.short_code.toLowerCase() === shortCode.toLowerCase())) {
          return fail(`A case type with short code "${shortCode}" already exists.`);
        }
      }
      return ok(await caseTypeService.update(id, patch));
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
      const existingNames = new Set(existing.map((t) => t.name.toLowerCase()));
      let maxOrder = existing.reduce((m, t) => Math.max(m, t.display_order ?? 0), 0);

      const pending = records.map((r) => {
        const name = (r.name || '').trim();
        let shortCode = (r.short_code || '').trim();
        if (!name) return null;
        if (!shortCode) shortCode = autoShortCode(name);
        if (!shortCode) return null;
        if (existingCodes.has(shortCode.toLowerCase())) return null;
        if (existingNames.has(name.toLowerCase())) return null;
        existingCodes.add(shortCode.toLowerCase());
        existingNames.add(name.toLowerCase());
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

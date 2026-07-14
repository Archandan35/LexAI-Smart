import { courtService } from '@/services/courtService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

export const courtLogic = {
  async list() {
    try {
      const rows = await courtService.list();
      return [...rows].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    } catch (err) { return fail(err); }
  },

  async names() {
    try {
      return (await this.list()).map((c) => c.name);
    } catch (err) { return fail(err); }
  },

  async create(data) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Court name is required.');
      return ok(await courtService.create({
        name,
        short_code: (data.short_code || '').trim().toUpperCase(),
        parent_id: data.parent_id || null,
        description: (data.description || '').trim(),
        display_order: data.display_order ?? 0,
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
        if (!name) return fail('Court name is required.');
        patch.name = name;
      }
      if (data.short_code !== undefined) patch.short_code = (data.short_code || '').trim().toUpperCase();
      if (data.parent_id !== undefined) patch.parent_id = data.parent_id || null;
      if (data.description !== undefined) patch.description = (data.description || '').trim();
      if (data.display_order !== undefined) patch.display_order = data.display_order;
      if (data.color !== undefined) patch.color = data.color;
      if (data.status !== undefined) patch.status = data.status || 'Active';
      return ok(await courtService.update(id, patch));
    } catch (err) { return fail(err); }
  },

  async remove(id) {
    try {
      return ok(await courtService.remove(id));
    } catch (err) { return fail(err); }
  },

  async reorder(orderedIds) {
    try {
      for (let i = 0; i < orderedIds.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await courtService.update(orderedIds[i], { display_order: i });
      }
      return ok(true);
    } catch (err) { return fail(err); }
  },

  async bulkCreate(records) {
    try {
      const existing = await courtService.list();
      const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));
      let maxOrder = existing.reduce((m, c) => Math.max(m, c.display_order ?? 0), 0);

      const pending = records.map((r) => {
        const name = (r.name || '').trim();
        if (!name) return null;
        if (existingNames.has(name.toLowerCase())) return null;
        existingNames.add(name.toLowerCase());
        maxOrder += 1;
        return {
          name,
          short_code: (r.short_code || '').trim().toUpperCase(),
          parent_id: r.parent_id || null,
          description: (r.description || '').trim(),
          display_order: maxOrder,
          status: 'Active',
          createdAt: nowISO()
        };
      }).filter(Boolean);

      if (!pending.length) return ok({ count: 0, items: [] });

      const created = [];
      const batchSize = 5;
      for (let i = 0; i < pending.length; i += batchSize) {
        const batch = pending.slice(i, i + batchSize);
        await Promise.all(batch.map((d) => courtService.create(d).then((item) => created.push(item)).catch(() => {})));
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
        await Promise.all(batch.map((id) => courtService.remove(id).then(() => { deleted += 1; }).catch(() => {})));
      }
      return ok({ deleted, failed: ids.length - deleted });
    } catch (err) { return fail(err); }
  },
};

export default courtLogic;

import { courtService } from '@/services/courtService.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

export const courtLogic = {
  async list() {
    const rows = await courtService.list();
    return [...rows].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  },

  async names() {
    return (await this.list()).map((c) => c.name);
  },

  async create(data) {
    const name = (data.name || '').trim();
    if (!name) return fail('Court name is required.');
    const existing = await courtService.list();
    if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return fail(`Court "${name}" already exists.`);
    }
    const order = existing.reduce((m, c) => Math.max(m, c.display_order ?? 0), 0) + 1;
    return ok(await courtService.create({
      name,
      display_order: order,
      status: 'Active',
      createdAt: nowISO(),
    }));
  },

  async update(id, data) {
    const name = (data.name || '').trim();
    if (!name) return fail('Court name is required.');
    return ok(await courtService.update(id, { name, display_order: data.display_order, status: data.status }));
  },

  async remove(id) {
    return ok(await courtService.remove(id));
  },

  async reorder(orderedIds) {
    for (let i = 0; i < orderedIds.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await courtService.update(orderedIds[i], { display_order: i });
    }
    return ok(true);
  },
};

export default courtLogic;

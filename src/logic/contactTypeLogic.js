import { contactTypeService } from '@/services/contactTypeService.js';
import { ok, fail } from '@/utils/result.js';
import { nowISO, uid } from '@/utils/id.js';

export const contactTypeLogic = {
  async list() {
    const rows = await contactTypeService.list();
    return [...rows].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  },

  async create(data) {
    try {
      const row = await contactTypeService.create({ ...data, id: uid('ct'), created_at: nowISO() });
      return ok(row);
    } catch (e) {
      return fail(e);
    }
  },

  async update(id, data) {
    try {
      const row = await contactTypeService.update(id, data);
      return ok(row);
    } catch (e) {
      return fail(e);
    }
  },

  async remove(id) {
    try {
      await contactTypeService.remove(id);
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  },
};

export default contactTypeLogic;

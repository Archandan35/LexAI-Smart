import { hearingStatusService } from '@/services/hearingStatusService.js';
import { ok, fail } from '@/utils/result.js';
import { nowISO, uid } from '@/utils/id.js';

export const hearingStatusLogic = {
  async list() {
    const rows = await hearingStatusService.list();
    return [...rows].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  },

  async create(data) {
    try {
      const row = await hearingStatusService.create({ ...data, id: uid('hs'), created_at: nowISO() });
      return ok(row);
    } catch (e) {
      return fail(e);
    }
  },

  async update(id, data) {
    try {
      const row = await hearingStatusService.update(id, { ...data, updatedAt: nowISO() });
      return ok(row);
    } catch (e) {
      return fail(e);
    }
  },

  async remove(id) {
    try {
      await hearingStatusService.remove(id);
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  },
};

export default hearingStatusLogic;

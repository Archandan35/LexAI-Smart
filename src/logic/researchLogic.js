import { researchService } from '@/services/researchService.js';
import { actService } from '@/services/actService.js';
import { ok, fail } from '@/utils/result.js';
import { MESSAGES } from '@/constants/messages.js';

// researchLogic — statute-anchored legal research. Retrieval-only.
export const researchLogic = {
  async acts() {
    const rows = await actService.list();
    return (Array.isArray(rows) ? rows : []).sort((a, b) => a.title?.localeCompare?.(b.title) || 0);
  },

  async research({ actId, query }) {
    try {
      const { act, results } = await researchService.researchAct({ actId, query });
      return ok({ act, results, message: results.length ? null : MESSAGES.noPrecedent });
    } catch (e) {
      return fail(e);
    }
  },
};

export default researchLogic;

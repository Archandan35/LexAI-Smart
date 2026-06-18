import { researchService } from '@/services/researchService.js';
import { ACTS } from '@/constants/acts.js';
import { ok, fail } from '@/utils/result.js';
import { MESSAGES } from '@/constants/messages.js';

// researchLogic — statute-anchored legal research. Retrieval-only.
export const researchLogic = {
  acts: () => ACTS,

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

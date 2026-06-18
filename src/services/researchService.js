import { citationService } from './citationService.js';
import { ACT_MAP } from '@/constants/acts.js';

// researchService — statute/research retrieval. Uses RETRIEVAL (citation +
// statute corpus), never AI memory, per the legal-safety rule.
export const researchService = {
  // Pull authorities relevant to a given Act/section via the citation provider.
  async researchAct({ actId, query }) {
    const act = ACT_MAP[actId];
    const results = await citationService.searchCases({
      act: actId,
      keywords: [act?.short, act?.label, query].filter(Boolean).join(' '),
    });
    return { act, results };
  },

  searchAuthorities: (query) => citationService.searchCases(query),
};

export default researchService;

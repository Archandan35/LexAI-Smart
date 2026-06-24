import { citationService } from './citationService.js';
import { actService } from './actService.js';

// researchService — statute/research retrieval. Uses RETRIEVAL (citation +
// statute corpus), never AI memory, per the legal-safety rule.
export const researchService = {
  // Pull authorities relevant to a given Act/section via the citation provider.
  async researchAct({ actId, query }) {
    const all = await actService.list();
    const act = (Array.isArray(all) ? all : []).find((a) => a.id === actId);
    const results = await citationService.searchCases({
      act: actId,
      keywords: [act?.short_code, act?.title, query].filter(Boolean).join(' '),
    });
    return { act, results };
  },

  searchAuthorities: (query) => citationService.searchCases(query),
};

export default researchService;

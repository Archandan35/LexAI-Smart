import { getCitationProvider } from '@/providers/citation/index.js';

// citationService — the ONLY path to legal authorities. Pages/logic obtain
// citations exclusively through here, which guarantees they originate from a
// real CitationProvider and were never invented by the AI layer.
export const citationService = {
  searchCases: (query) => getCitationProvider().searchCases(query),
  verifyCitation: (citation) => getCitationProvider().verifyCitation(citation),
  fetchJudgment: (id) => getCitationProvider().fetchJudgment(id),
  extractParagraphs: (id) => getCitationProvider().extractParagraphs(id),
};

export default citationService;

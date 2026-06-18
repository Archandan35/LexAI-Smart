import { citationService } from '@/services/citationService.js';
import { VERIFICATION_STATUS, MESSAGES } from '@/constants/messages.js';
import { ok, fail } from '@/utils/result.js';

// citationLogic — implements the mandated workflow:
// Facts → Issue Extraction → Search → Retrieve → Verify → Rank → Display.
// Never fabricates. If nothing is retrieved, returns the "no precedent" state.
export const citationLogic = {
  // Lightweight issue extraction from free-text facts (no AI fabrication risk).
  extractIssues(facts = '') {
    const triggers = [
      { re: /limitation|time[- ]barred|delay/i, issue: 'Limitation / condonation of delay' },
      { re: /jurisdiction|territorial|pecuniary/i, issue: 'Jurisdiction' },
      { re: /injunction|status quo/i, issue: 'Injunction / interim relief' },
      { re: /title|ownership|declaration/i, issue: 'Declaration of title' },
      { re: /contract|breach|agreement|supply/i, issue: 'Breach of contract' },
      { re: /bail|custody|remand/i, issue: 'Bail' },
      { re: /res ?judicata|estoppel/i, issue: 'Res judicata / estoppel' },
      { re: /cause of action|rejection of plaint/i, issue: 'Cause of action / O.VII R.11' },
    ];
    const found = triggers.filter((t) => t.re.test(facts)).map((t) => t.issue);
    return found.length ? found : ['General precedent'];
  },

  async search(query) {
    try {
      const issues = query.issue ? [query.issue] : this.extractIssues(query.facts);
      const results = await citationService.searchCases({ ...query, issue: issues.join(' ') });
      if (!results.length) {
        return ok({ results: [], issues, message: MESSAGES.noPrecedent });
      }
      return ok({ results, issues, message: null });
    } catch (e) {
      return fail(e);
    }
  },

  async verify(citation) {
    if (!citation || !citation.trim()) return fail('Enter a citation to verify.');
    try {
      const result = await citationService.verifyCitation(citation.trim());
      return ok(result);
    } catch (e) {
      return fail(e);
    }
  },

  async paragraphs(judgmentId) {
    try {
      return ok(await citationService.extractParagraphs(judgmentId));
    } catch (e) {
      return fail(e);
    }
  },

  statusLabel(status) {
    switch (status) {
      case VERIFICATION_STATUS.VERIFIED: return 'Verified';
      case VERIFICATION_STATUS.NOT_FOUND: return 'Not found';
      case VERIFICATION_STATUS.UNVERIFIED: return 'Unverified';
      default: return 'Pending';
    }
  },
};

export default citationLogic;

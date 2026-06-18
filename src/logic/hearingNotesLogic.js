import { caseService } from '@/services/caseService.js';
import { citationService } from '@/services/citationService.js';
import { analysisService } from '@/services/analysisService.js';
import { sentences } from '@/utils/text.js';
import { ok, fail } from '@/utils/result.js';

// hearingNotesLogic — assembles structured hearing notes for a case:
// Facts, Issues, Evidence, Citations (verified only), Oral Submissions.
export const hearingNotesLogic = {
  async generate({ caseId, facts = '', issuesText = '' }) {
    try {
      const theCase = caseId ? await caseService.getCase(caseId) : null;
      const documents = caseId ? await caseService.listDocuments(caseId) : [];

      const baseFacts = facts || theCase?.description || '';
      const factPoints = sentences(baseFacts).slice(0, 8);

      const issues = (issuesText
        ? issuesText.split('\n')
        : deriveIssues(baseFacts)
      ).map((s) => s.trim()).filter(Boolean);

      const evidence = documents.map((d) => ({ exhibit: d.name, folder: d.folder }));

      // Citations come ONLY from the citation provider.
      let citations = [];
      try {
        citations = await citationService.searchCases({ facts: baseFacts, issue: issues.join(' ') });
      } catch { citations = []; }

      let oralSubmissions = '';
      try {
        oralSubmissions = await analysisService.ask(
          `Draft concise oral submission points (no citations) for: ${baseFacts.slice(0, 1200)}`
        );
      } catch { oralSubmissions = 'Prepare oral submissions emphasising the strongest pleaded facts.'; }

      return ok({
        case: theCase,
        facts: factPoints,
        issues: issues.length ? issues : ['Frame issues after pleadings are complete.'],
        evidence,
        citations,
        oralSubmissions,
      });
    } catch (e) {
      return fail(e);
    }
  },
};

function deriveIssues(text) {
  const out = [];
  if (/title|ownership|declaration/i.test(text)) out.push('Whether the plaintiff has proved title?');
  if (/contract|breach|agreement/i.test(text)) out.push('Whether there was a breach of contract?');
  if (/limitation|delay/i.test(text)) out.push('Whether the suit is within limitation?');
  if (/injunction/i.test(text)) out.push('Whether the plaintiff is entitled to injunction?');
  if (/damages|recovery|amount/i.test(text)) out.push('Whether the plaintiff is entitled to the relief claimed?');
  return out.length ? out : ['Whether the plaintiff is entitled to the relief claimed?'];
}

export default hearingNotesLogic;

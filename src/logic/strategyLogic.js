import { sentences } from '@/utils/text.js';
import { ok, fail } from '@/utils/result.js';

// strategyLogic — litigation strategy engine. Scans pleadings for classic
// threshold defences and structural defects, returning actionable flags.
const RULES = [
  { id: 'limitation', label: 'Limitation', re: /limitation|time[- ]barred|delay|barred by time/i,
    note: 'Examine whether the suit/appeal is within the prescribed period under the Limitation Act, 1963; consider condonation.' },
  { id: 'estoppel', label: 'Estoppel', re: /estoppel|representation|acted upon|promissory/i,
    note: 'Consider estoppel / promissory estoppel arising from prior conduct or representation.' },
  { id: 'res_judicata', label: 'Res Judicata', re: /res ?judicata|previously decided|same cause|earlier suit/i,
    note: 'Check Section 11 CPC bar — same matter directly and substantially in issue between same parties.' },
  { id: 'non_joinder', label: 'Non-Joinder / Mis-Joinder', re: /non[- ]joinder|mis[- ]joinder|necessary part(y|ies)|proper part(y|ies)/i,
    note: 'Verify all necessary and proper parties under Order I CPC are joined.' },
  { id: 'jurisdiction', label: 'Jurisdiction Defect', re: /jurisdiction|territorial|pecuniary|cognizance/i,
    note: 'Confirm territorial and pecuniary jurisdiction; raise want of jurisdiction if applicable.' },
  { id: 'cause_of_action', label: 'Cause of Action Defect', re: /cause of action|no cause|does not disclose|rejection of plaint|order vii/i,
    note: 'Assess whether the plaint discloses a cause of action; consider Order VII Rule 11 CPC.' },
];

export const strategyLogic = {
  async analyze({ text }) {
    if (!text || text.trim().length < 20) return fail('Provide pleadings/case text to analyze.');
    try {
      const sents = sentences(text);
      const flags = RULES.map((r) => {
        const hits = sents.filter((s) => r.re.test(s));
        return {
          id: r.id,
          label: r.label,
          triggered: hits.length > 0,
          note: r.note,
          evidence: hits.slice(0, 3).map((s) => s.trim()),
        };
      });
      const triggered = flags.filter((f) => f.triggered);
      const recommendations = triggered.map((f) => `${f.label}: ${f.note}`);
      return ok({
        flags,
        triggeredCount: triggered.length,
        recommendations: recommendations.length
          ? recommendations
          : ['No threshold defence keywords detected. Proceed on merits; revisit after evidence.'],
      });
    } catch (e) {
      return fail(e);
    }
  },
};

export default strategyLogic;

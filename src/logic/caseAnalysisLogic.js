import { analysisService } from '@/services/analysisService.js';
import { sentences, extractDates } from '@/utils/text.js';
import { ok, fail } from '@/utils/result.js';

// caseAnalysisLogic — detects weaknesses, contradictions, admissions, missing
// pleadings, limitation & jurisdiction issues. Heuristic-first so it works with
// the mock AI; the AI summary augments but never replaces the rule findings.
const ADMISSION_RE = /\b(admitted|admit|acknowledg|conced|not disputed|undisputed|it is true that)\b/i;
const PLEADING_KEYS = [
  { key: 'cause of action', label: 'Cause of action' },
  { key: 'jurisdiction', label: 'Jurisdiction averment' },
  { key: 'limitation', label: 'Limitation averment' },
  { key: 'valuation', label: 'Valuation & court fee' },
  { key: 'cause title', label: 'Cause title / parties' },
  { key: 'verification', label: 'Verification clause' },
  { key: 'prayer', label: 'Prayer / relief' },
];

export const caseAnalysisLogic = {
  async analyze({ text, type }) {
    if (!text || text.trim().length < 20) return fail('Provide document text to analyze.');
    try {
      const lower = text.toLowerCase();
      const sents = sentences(text);

      const admissions = sents.filter((s) => ADMISSION_RE.test(s)).map((s) => s.trim());

      const missingPleadings = PLEADING_KEYS
        .filter((p) => !lower.includes(p.key))
        .map((p) => p.label);

      const contradictions = this.detectContradictions(sents);

      const limitationIssues = this.checkLimitation(text);
      const jurisdictionIssues = lower.includes('jurisdiction')
        ? []
        : ['No express averment on territorial/pecuniary jurisdiction found.'];

      const weaknesses = [
        ...(admissions.length ? [`Document contains ${admissions.length} apparent admission(s) that may bind the party.`] : []),
        ...(missingPleadings.length ? [`Possibly missing pleadings: ${missingPleadings.join(', ')}.`] : []),
        ...(contradictions.length ? [`${contradictions.length} internal contradiction(s) detected.`] : []),
        ...limitationIssues,
        ...jurisdictionIssues,
      ];

      let aiSummary = '';
      try {
        const res = await analysisService.analyzeDocument({ text, meta: { type } });
        aiSummary = res.summary || '';
      } catch { /* AI optional */ }

      return ok({
        weaknesses,
        contradictions,
        admissions,
        missingPleadings,
        limitationIssues,
        jurisdictionIssues,
        aiSummary,
      });
    } catch (e) {
      return fail(e);
    }
  },

  detectContradictions(sents) {
    const out = [];
    const NEG = /\b(not|never|denies?|denied|without|no )\b/i;
    for (let i = 0; i < sents.length; i += 1) {
      for (let j = i + 1; j < sents.length; j += 1) {
        const a = sents[i];
        const b = sents[j];
        const shared = sharedKeywords(a, b);
        if (shared.length >= 2 && NEG.test(a) !== NEG.test(b)) {
          out.push({ a: a.trim(), b: b.trim(), on: shared.slice(0, 3).join(', ') });
          if (out.length >= 12) return out;
        }
      }
    }
    return out;
  },

  checkLimitation(text) {
    const dates = extractDates(text);
    const issues = [];
    if (dates.length && /suit|filed|institut/i.test(text)) {
      issues.push(`Verify limitation: ${dates.length} date(s) referenced — confirm the cause of action falls within the Limitation Act period.`);
    }
    if (/time[- ]barred|beyond limitation|condon/i.test(text)) {
      issues.push('Express limitation/condonation language present — examine sufficiency of cause.');
    }
    return issues;
  },
};

function sharedKeywords(a, b) {
  const stop = new Set('the a an of to in and or for is are was were be that this it on at by with as not no shall will'.split(' '));
  const wa = new Set((a.toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => !stop.has(w)));
  const wb = (b.toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => !stop.has(w));
  return [...new Set(wb.filter((w) => wa.has(w)))];
}

export default caseAnalysisLogic;

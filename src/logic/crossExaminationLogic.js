import { analysisService } from '@/services/analysisService.js';
import { sentences } from '@/utils/text.js';
import { ok, fail } from '@/utils/result.js';

// crossExaminationLogic — generates four question banks from a witness statement
// or chief examination: friendly, hostile, impeachment, admission. Heuristic
// generation guarantees output even with the mock AI.
export const crossExaminationLogic = {
  async generate({ statement, witnessName = 'the witness' }) {
    if (!statement || statement.trim().length < 20) {
      return fail('Provide the witness statement / chief examination text.');
    }
    try {
      const sents = sentences(statement).slice(0, 30);

      const friendly = sents.slice(0, 6).map((s) => ({
        q: `Is it correct that ${softParaphrase(s)}?`,
        purpose: 'Establish favourable, undisputed facts.',
      }));

      const admission = sents
        .filter((s) => /\b(was|were|did|received|paid|signed|executed|present|aware)\b/i.test(s))
        .slice(0, 6)
        .map((s) => ({
          q: `You will agree that ${softParaphrase(s)}, correct?`,
          purpose: 'Secure a binding admission.',
        }));

      const hostile = sents
        .filter((s) => /\b(never|did not|denied|false|wrong|not aware|cannot)\b/i.test(s))
        .slice(0, 6)
        .map((s) => ({
          q: `I put it to you that, contrary to your statement, ${negate(s)} — what do you say?`,
          purpose: 'Challenge the witness on disputed assertions.',
        }));

      const impeachment = sents.slice(0, 6).map((s, i) => ({
        q: `In your earlier statement you stated "${trimQuote(s)}". Do you stand by every word, or has your account changed?`,
        purpose: 'Set up prior-inconsistent-statement impeachment.',
        anchor: `Statement sentence #${i + 1}`,
      }));

      let aiHints = '';
      try {
        aiHints = await analysisService.ask(
          `Suggest cross-examination themes (no citations) for ${witnessName} given this statement:\n${statement.slice(0, 1500)}`
        );
      } catch { /* optional */ }

      return ok({
        banks: { friendly, hostile, impeachment, admission },
        aiHints,
      });
    } catch (e) {
      return fail(e);
    }
  },
};

function softParaphrase(s) {
  return lowerFirst(s.replace(/\.$/, '').replace(/^(that|the deponent states that)\s+/i, ''));
}
function negate(s) {
  return softParaphrase(s).replace(/\bis\b/, 'is not').replace(/\bwas\b/, 'was not');
}
function trimQuote(s) {
  return s.length > 120 ? `${s.slice(0, 117)}…` : s;
}
function lowerFirst(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

export default crossExaminationLogic;

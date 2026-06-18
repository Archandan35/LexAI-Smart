import { sentences } from '@/utils/text.js';
import { ok, fail } from '@/utils/result.js';

// evidenceLogic — Evidence Gap Analyzer. Maps each pleaded claim to supporting
// evidence and surfaces gaps (claims with no matching exhibit/document).
export const evidenceLogic = {
  analyze({ claims = [], evidenceItems = [] }) {
    if (!claims.length) return fail('Add at least one claim.');
    const evBlob = evidenceItems.map((e) => `${e.label} ${e.description || ''}`.toLowerCase());
    const rows = claims.map((claim) => {
      const keys = (claim.toLowerCase().match(/[a-z]{4,}/g) || []);
      const supporting = evidenceItems.filter((e, i) =>
        keys.some((k) => evBlob[i].includes(k))
      );
      return {
        claim,
        supporting: supporting.map((s) => s.label),
        missing: supporting.length === 0,
        suggestion: supporting.length === 0
          ? 'No exhibit on record supports this claim — file/produce documentary or oral evidence.'
          : null,
      };
    });
    const gaps = rows.filter((r) => r.missing).length;
    return ok({ rows, gaps, total: rows.length });
  },

  // Helper: derive candidate claims from pleading text.
  deriveClaims(text = '') {
    return sentences(text)
      .filter((s) => /\b(claim|entitled|liable|owns?|paid|executed|breach|due|damages)\b/i.test(s))
      .slice(0, 20)
      .map((s) => s.trim());
  },
};

export default evidenceLogic;

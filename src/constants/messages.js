// Centralized user-facing strings, especially legal-safety messaging.
export const MESSAGES = {
  noPrecedent: 'No verified precedent found.',
  citationGuardrail:
    'LexAI never fabricates citations. Only verified judgments retrieved from a citation provider are shown.',
  verifying: 'Verifying against citation source…',
  unverified: 'Unverified — do not rely on this until verified against an authoritative source.',
  emptyState: 'Nothing here yet.',
  saving: 'Saving…',
  saved: 'Saved.',
  generating: 'Generating…',
};

export const VERIFICATION_STATUS = {
  VERIFIED: 'verified',
  UNVERIFIED: 'unverified',
  NOT_FOUND: 'not_found',
  PENDING: 'pending',
};

export default MESSAGES;

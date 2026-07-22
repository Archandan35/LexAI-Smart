import { describe, it, expect } from 'vitest';
import { combinedCourt, extractJurisdiction } from './caseFormat.js';

describe('combinedCourt', () => {
  it('returns court_name if present', () => {
    expect(combinedCourt({ court_name: 'Civil Judge, Athgarh' })).toBe('Civil Judge, Athgarh');
  });

  it('returns courtName if present and court_name is not', () => {
    expect(combinedCourt({ courtName: 'District Court, Cuttack' })).toBe('District Court, Cuttack');
  });

  it('combines court and jurisdiction when both present', () => {
    expect(combinedCourt({ court: 'Civil Judge', jurisdiction: 'Athgarh' })).toBe('Civil Judge, Athgarh');
  });

  it('returns court when only court is present', () => {
    expect(combinedCourt({ court: 'High Court' })).toBe('High Court');
  });

  it('returns jurisdiction when only jurisdiction is present', () => {
    expect(combinedCourt({ jurisdiction: 'Cuttack' })).toBe('Cuttack');
  });

  it('returns em dash when neither court nor jurisdiction', () => {
    expect(combinedCourt({})).toBe('—');
  });

  it('returns empty string for null/undefined', () => {
    expect(combinedCourt(null)).toBe('');
    expect(combinedCourt(undefined)).toBe('');
  });
});

describe('extractJurisdiction', () => {
  it('extracts jurisdiction from court_name after ", "', () => {
    expect(extractJurisdiction({ court_name: 'Civil Judge, Athgarh' })).toBe('Athgarh');
  });

  it('returns empty string if no comma in court_name', () => {
    expect(extractJurisdiction({ court_name: 'Supreme Court' })).toBe('');
  });

  it('falls back to courtName if court_name is absent', () => {
    expect(extractJurisdiction({ courtName: 'District Court, Cuttack' })).toBe('Cuttack');
  });

  it('returns empty string for null/undefined', () => {
    expect(extractJurisdiction(null)).toBe('');
    expect(extractJurisdiction(undefined)).toBe('');
  });

  it('returns empty string for empty object', () => {
    expect(extractJurisdiction({})).toBe('');
  });
});

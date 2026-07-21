import { describe, it, expect } from 'vitest';
import { DateEngine } from './DateEngine.js';

describe('DateEngine', () => {
  describe('toDisplayDate', () => {
    it('formats ISO date to display format', () => {
      const result = DateEngine.toDisplayDate('2024-03-15');
      expect(result).toBe('15/03/2024');
    });

    it('handles empty input', () => {
      expect(DateEngine.toDisplayDate('')).toBe('');
      expect(DateEngine.toDisplayDate(null)).toBe('');
      expect(DateEngine.toDisplayDate(undefined)).toBe('');
    });
  });

  describe('now', () => {
    it('returns current ISO timestamp', () => {
      const now = DateEngine.now();
      expect(typeof now).toBe('string');
      expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('formatTime', () => {
    it('formats ISO time to short format', () => {
      const result = DateEngine.formatTime('2024-03-15T14:30:00');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

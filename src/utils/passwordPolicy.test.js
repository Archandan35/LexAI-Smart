import { describe, it, expect, vi } from 'vitest';
import settingsCache from '@/core/settingsCache.js';
import { validatePassword, getPasswordMinLength } from './passwordPolicy.js';

describe('passwordPolicy', () => {
  describe('validatePassword', () => {
    it('returns valid=false and errors for password that is too short', () => {
      vi.spyOn(settingsCache, 'get').mockReturnValue('Medium (8+ chars)');
      const result = validatePassword('Ab1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least 8 characters');
    });

    it('returns valid=true and empty errors for a strong password', () => {
      vi.spyOn(settingsCache, 'get').mockReturnValue('Medium (8+ chars)');
      const result = validatePassword('StrongP4ss');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('getPasswordMinLength', () => {
    it('returns a number >= 4', () => {
      vi.spyOn(settingsCache, 'get').mockReturnValue('Medium (8+ chars)');
      const length = getPasswordMinLength();
      expect(typeof length).toBe('number');
      expect(length).toBeGreaterThanOrEqual(4);
    });
  });
});

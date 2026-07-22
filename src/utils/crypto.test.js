import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './crypto.js';

describe('crypto', () => {
  describe('hashPassword', () => {
    it('returns an object with salt, hash, and algorithm', async () => {
      const result = await hashPassword('TestPass123!');
      expect(result).toHaveProperty('salt');
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('algorithm');
      expect(typeof result.salt).toBe('string');
      expect(result.salt.length).toBeGreaterThan(0);
      expect(typeof result.hash).toBe('string');
      expect(result.hash.length).toBeGreaterThan(0);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for a matching password/hash/salt combination', async () => {
      const { salt, hash } = await hashPassword('CorrectHorseBatteryStaple');
      const result = await verifyPassword('CorrectHorseBatteryStaple', salt, hash);
      expect(result).toBe(true);
    });

    it('returns false for a wrong password', async () => {
      const { salt, hash } = await hashPassword('RealPassword');
      const result = await verifyPassword('WrongPassword', salt, hash);
      expect(result).toBe(false);
    });
  });
});

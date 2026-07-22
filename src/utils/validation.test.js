import { describe, it, expect } from 'vitest';
import { validators, validate } from './validation.js';

describe('validators', () => {
  describe('required', () => {
    const req = validators.required('Required');

    it('rejects null', () => expect(req(null)).toBe('Required'));
    it('rejects undefined', () => expect(req(undefined)).toBe('Required'));
    it('rejects empty string', () => expect(req('')).toBe('Required'));
    it('passes when value present', () => expect(req('hello')).toBeNull());
  });

  describe('minLength', () => {
    const min3 = validators.minLength(3, 'Too short');

    it('rejects short string', () => expect(min3('ab')).toBe('Too short'));
    it('passes long enough string', () => expect(min3('abc')).toBeNull());
    it('rejects null/undefined', () => expect(min3(null)).toBe('Too short'));
  });

  describe('maxLength', () => {
    const max3 = validators.maxLength(3, 'Too long');

    it('rejects long string', () => expect(max3('abcd')).toBe('Too long'));
    it('passes short enough string', () => expect(max3('abc')).toBeNull());
    it('passes null', () => expect(max3(null)).toBeNull());
  });

  describe('email', () => {
    const em = validators.email('Invalid email');

    it('rejects bad email', () => expect(em('notanemail')).toBe('Invalid email'));
    it('passes good email', () => expect(em('a@b.com')).toBeNull());
    it('passes null', () => expect(em(null)).toBeNull());
  });

  describe('pattern', () => {
    const digitOnly = validators.pattern(/^\d+$/, 'Digits only');

    it('rejects non-digit string', () => expect(digitOnly('abc')).toBe('Digits only'));
    it('passes digit string', () => expect(digitOnly('123')).toBeNull());
    it('passes null', () => expect(digitOnly(null)).toBeNull());
  });

  describe('oneOf', () => {
    const size = validators.oneOf(['S', 'M', 'L'], 'Invalid size');

    it('rejects value not in list', () => expect(size('XL')).toBe('Invalid size'));
    it('passes value in list', () => expect(size('M')).toBeNull());
    it('passes null', () => expect(size(null)).toBeNull());
  });

  describe('matches', () => {
    const match = validators.matches('confirm', 'Must match');

    it('rejects when fields differ', () => expect(match('abc', { confirm: 'xyz' })).toBe('Must match'));
    it('passes when fields match', () => expect(match('abc', { confirm: 'abc' })).toBeNull());
  });
});

describe('validate', () => {
  it('returns valid=true when no errors', () => {
    const result = validate({ name: 'John' }, { name: validators.required('Req') });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('returns valid=false with errors', () => {
    const result = validate({ name: '' }, { name: validators.required('Req') });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({ name: 'Req' });
  });

  it('returns first error only per field', () => {
    const result = validate(
      { name: '' },
      { name: [validators.required('Req'), validators.minLength(3, 'Short')] },
    );
    expect(result.errors.name).toBe('Req');
  });
});

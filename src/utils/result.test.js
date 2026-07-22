import { describe, it, expect } from 'vitest';
import { ok, fail, guard } from './result.js';

describe('result', () => {
  describe('ok', () => {
    it('returns { ok: true, data, error: null }', () => {
      const result = ok('some data');
      expect(result).toEqual({ ok: true, data: 'some data', error: null });
    });
  });

  describe('fail', () => {
    it('returns { ok: false, data: null, error } for a string error', () => {
      const result = fail('something went wrong');
      expect(result).toEqual({ ok: false, data: null, error: 'something went wrong' });
    });

    it('returns { ok: false, data: null, error } for an Error object', () => {
      const result = fail(new Error('oops'));
      expect(result).toEqual({ ok: false, data: null, error: 'oops' });
    });
  });

  describe('guard', () => {
    it('wraps a successful function and returns ok', async () => {
      const fn = async () => 42;
      const result = await guard(fn);
      expect(result).toEqual({ ok: true, data: 42, error: null });
    });

    it('wraps a throwing function and returns fail', async () => {
      const fn = async () => { throw new Error('failure'); };
      const result = await guard(fn);
      expect(result).toEqual({ ok: false, data: null, error: 'failure' });
    });
  });
});

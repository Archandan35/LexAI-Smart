import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IDEngine } from './IDEngine.js';

const mockProvider = {
  rpc: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
};

vi.mock('@/providers/database/index.js', () => ({
  getDatabaseProvider: vi.fn(() => mockProvider),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('prefix', () => {
  it('returns correct prefix for known entity', () => {
    expect(IDEngine.prefix('users')).toBe('USR');
    expect(IDEngine.prefix('cases')).toBe('CASE');
    expect(IDEngine.prefix('hearings')).toBe('HEAR');
  });

  it('returns uppercase first 5 chars for unknown entity', () => {
    expect(IDEngine.prefix('unknownEntity')).toBe('UNKNO');
  });
});

describe('padding', () => {
  it('returns correct padding for known entity', () => {
    expect(IDEngine.padding('users')).toBe(5);
  });

  it('returns 5 for unknown entity', () => {
    expect(IDEngine.padding('unknown')).toBe(5);
  });
});

describe('entityFromId', () => {
  it('returns entity name for valid LX-ID', () => {
    expect(IDEngine.entityFromId('LX-USR-00001')).toBe('users');
    expect(IDEngine.entityFromId('LX-CASE-00042')).toBe('cases');
  });

  it('returns null when ID does not start with LX-', () => {
    expect(IDEngine.entityFromId('USR-00001')).toBeNull();
    expect(IDEngine.entityFromId('ABC-DEF-123')).toBeNull();
  });

  it('returns null when ID has fewer than 3 parts', () => {
    expect(IDEngine.entityFromId('LX-USR')).toBeNull();
  });

  it('returns null for null/undefined input', () => {
    expect(IDEngine.entityFromId(null)).toBeNull();
    expect(IDEngine.entityFromId(undefined)).toBeNull();
  });
});

describe('providerId', () => {
  it('returns a string containing an underscore', () => {
    const id = IDEngine.providerId();
    expect(typeof id).toBe('string');
    expect(id).toContain('_');
    expect(id.length).toBeGreaterThan(5);
  });
});

describe('listPrefixes', () => {
  it('returns an array of prefix objects', () => {
    const list = IDEngine.listPrefixes();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(10);
    expect(list[0]).toHaveProperty('entity');
    expect(list[0]).toHaveProperty('prefix');
    expect(list[0]).toHaveProperty('padding');
  });
});

describe('generate', () => {
  it('returns a string starting with LX-', async () => {
    mockProvider.get.mockRejectedValue(new Error('not found'));
    mockProvider.create.mockResolvedValue({});
    const id = await IDEngine.generate('users');
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^LX-USR-\d{5}$/);
  });

  it('increments sequence on successive calls', async () => {
    mockProvider.get.mockRejectedValue(new Error('not found'));
    mockProvider.create.mockResolvedValue({});
    const id1 = await IDEngine.generate('users');
    const id2 = await IDEngine.generate('users');
    expect(id1).not.toBe(id2);
    const seq1 = parseInt(id1.split('-')[2], 10);
    const seq2 = parseInt(id2.split('-')[2], 10);
    expect(seq2).toBe(seq1 + 1);
  });
});

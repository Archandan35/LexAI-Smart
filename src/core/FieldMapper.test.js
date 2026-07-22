import { describe, it, expect, beforeEach } from 'vitest';
import { FieldMapper } from './FieldMapper.js';

beforeEach(() => {
  FieldMapper.reset();
});

describe('setFieldMapping / toProviderField', () => {
  it('maps a single LexAI field to a provider field', () => {
    FieldMapper.setFieldMapping('users', 'name', 'full_name');
    expect(FieldMapper.toProviderField('users', 'name')).toBe('full_name');
  });

  it('returns the original field if no mapping exists', () => {
    expect(FieldMapper.toProviderField('users', 'nonexistent')).toBe('nonexistent');
  });

  it('returns the original field for unmapped entity', () => {
    expect(FieldMapper.toProviderField('newEntity', 'name')).toBe('name');
  });
});

describe('toLexAIField', () => {
  it('reverse-maps a provider field to a LexAI field', () => {
    FieldMapper.setFieldMapping('users', 'name', 'full_name');
    expect(FieldMapper.toLexAIField('users', 'full_name')).toBe('name');
  });

  it('returns the original field if no reverse mapping exists', () => {
    expect(FieldMapper.toLexAIField('users', 'unknown_col')).toBe('unknown_col');
  });
});

describe('setFieldMappings', () => {
  it('sets multiple mappings at once', () => {
    FieldMapper.setFieldMappings('products', {
      title: 'product_title',
      price: 'product_price',
    });
    expect(FieldMapper.toProviderField('products', 'title')).toBe('product_title');
    expect(FieldMapper.toProviderField('products', 'price')).toBe('product_price');
  });
});

describe('toProvider', () => {
  it('translates an entire record from LexAI to provider fields', () => {
    FieldMapper.setFieldMapping('users', 'name', 'full_name');
    FieldMapper.setFieldMapping('users', 'createdAt', 'created_at');

    const result = FieldMapper.toProvider('users', { name: 'Alice', createdAt: '2024-01-01', extra: 42 });
    expect(result).toEqual({ full_name: 'Alice', created_at: '2024-01-01', extra: 42 });
  });

  it('returns a copy of the record for unmapped entity', () => {
    const result = FieldMapper.toProvider('newEntity', { a: 1 });
    expect(result).toEqual({ a: 1 });
  });

  it('returns empty object for empty record', () => {
    const result = FieldMapper.toProvider('users', {});
    expect(result).toEqual({});
  });

  it('handles null/undefined record', () => {
    expect(FieldMapper.toProvider('users', null)).toEqual({});
    expect(FieldMapper.toProvider('users', undefined)).toEqual({});
  });
});

describe('toLexAI', () => {
  it('translates an entire record from provider to LexAI fields', () => {
    FieldMapper.setFieldMapping('users', 'name', 'full_name');
    FieldMapper.setFieldMapping('users', 'createdAt', 'created_at');

    const result = FieldMapper.toLexAI('users', { full_name: 'Bob', created_at: '2024-02-01' });
    expect(result).toEqual({ name: 'Bob', createdAt: '2024-02-01' });
  });

  it('returns a copy of the record for unmapped entity', () => {
    const result = FieldMapper.toLexAI('newEntity', { a: 1 });
    expect(result).toEqual({ a: 1 });
  });
});

describe('filterToProvider', () => {
  it('translates filter keys from LexAI to provider names', () => {
    FieldMapper.setFieldMapping('users', 'createdAt', 'created_at');
    const result = FieldMapper.filterToProvider('users', { createdAt: '2024-01-01', status: 'active' });
    expect(result).toEqual({ created_at: '2024-01-01', status: 'active' });
  });
});

describe('getMappings', () => {
  it('returns a copy of mappings for an entity', () => {
    FieldMapper.setFieldMapping('users', 'name', 'full_name');
    const mappings = FieldMapper.getMappings('users');
    expect(mappings).toEqual({ name: 'full_name' });
  });

  it('returns empty object for unknown entity', () => {
    const mappings = FieldMapper.getMappings('unknown');
    expect(mappings).toEqual({});
  });
});

describe('reset', () => {
  it('clears all mappings', () => {
    FieldMapper.setFieldMapping('users', 'name', 'full_name');
    FieldMapper.reset();
    expect(FieldMapper.getMappings('users')).toEqual({});
    expect(FieldMapper.toProviderField('users', 'name')).toBe('name');
  });
});

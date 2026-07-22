import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from './useFormValidation.js';
import { validators } from '@/utils/validation.js';

const rules = {
  name: validators.required('Name is required'),
  email: [validators.required('Email is required'), validators.email('Invalid email')],
};

describe('useFormValidation', () => {
  it('initialises with provided values', () => {
    const { result } = renderHook(() => useFormValidation({ name: '', email: '' }, rules));
    expect(result.current.values).toEqual({ name: '', email: '' });
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });

  it('setField does not validate untouched fields', () => {
    const { result } = renderHook(() => useFormValidation({ name: '', email: '' }, rules));
    act(() => { result.current.setField('name', ''); });
    expect(result.current.errors.name).toBeUndefined();
  });

  it('setField validates touched fields', () => {
    const { result } = renderHook(() => useFormValidation({ name: '', email: '' }, rules));
    act(() => { result.current.setTouchedField('name'); });
    act(() => { result.current.setField('name', ''); });
    expect(result.current.errors.name).toBe('Name is required');
  });

  it('setField clears error on valid value', () => {
    const { result } = renderHook(() => useFormValidation({ name: '', email: '' }, rules));
    act(() => { result.current.setTouchedField('name'); });
    act(() => { result.current.setField('name', ''); });
    expect(result.current.errors.name).toBe('Name is required');
    act(() => { result.current.setField('name', 'John'); });
    expect(result.current.errors.name).toBeNull();
  });

  it('validateAll returns false and sets errors', () => {
    const { result } = renderHook(() => useFormValidation({ name: '', email: '' }, rules));
    let valid;
    act(() => { valid = result.current.validateAll(); });
    expect(valid).toBe(false);
    expect(result.current.errors.name).toBe('Name is required');
    expect(result.current.errors.email).toBe('Email is required');
    expect(result.current.touched).toEqual({ name: true, email: true });
  });

  it('validateAll returns true when all fields valid', () => {
    const { result } = renderHook(() => useFormValidation({ name: 'John', email: 'a@b.com' }, rules));
    let valid;
    act(() => { valid = result.current.validateAll(); });
    expect(valid).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it('reset restores initial values and clears errors/touched', () => {
    const { result } = renderHook(() => useFormValidation({ name: '', email: '' }, rules));
    act(() => { result.current.setField('name', 'John'); });
    act(() => { result.current.setTouchedField('name'); });
    act(() => { result.current.reset(); });
    expect(result.current.values).toEqual({ name: '', email: '' });
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });
});

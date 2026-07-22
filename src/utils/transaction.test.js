import { describe, it, expect, vi } from 'vitest';
import { Transaction, transaction } from './transaction.js';

describe('Transaction', () => {
  it('commits all operations in order', async () => {
    const tx = new Transaction();
    const order = [];
    tx.add('op1', async () => { order.push(1); return 'a'; }, vi.fn());
    tx.add('op2', async () => { order.push(2); return 'b'; }, vi.fn());

    const results = await tx.commit();
    expect(order).toEqual([1, 2]);
    expect(results).toEqual(['a', 'b']);
  });

  it('rolls back all previous operations when one fails', async () => {
    const tx = new Transaction();
    const rollback1 = vi.fn();
    const rollback2 = vi.fn();

    tx.add('op1', async () => 'ok', rollback1);
    tx.add('op2', async () => { throw new Error('fail'); }, rollback2);

    await expect(tx.commit()).rejects.toThrow('fail');
    expect(rollback1).toHaveBeenCalledOnce();
    expect(rollback2).not.toHaveBeenCalled();
  });

  it('throws if committed twice', async () => {
    const tx = new Transaction();
    tx.add('op', async () => 'ok', vi.fn());
    await tx.commit();
    await expect(tx.commit()).rejects.toThrow('Transaction already committed');
  });

  it('does not throw if rollback itself fails', async () => {
    const tx = new Transaction();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    tx.add('op1', async () => 'ok', async () => { throw new Error('rollback fail'); });
    tx.add('op2', async () => { throw new Error('op fail'); }, vi.fn());

    await expect(tx.commit()).rejects.toThrow('op fail');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('transaction helper', () => {
  it('composes operations with the helper function', async () => {
    const results = await transaction(async (tx) => {
      tx.add('a', () => 'x', vi.fn());
      tx.add('b', () => 'y', vi.fn());
    });
    expect(results).toEqual(['x', 'y']);
  });
});

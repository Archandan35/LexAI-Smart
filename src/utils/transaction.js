export class Transaction {
  constructor() {
    this.operations = [];
    this.snapshots = [];
    this.committed = false;
  }

  add(name, action, rollback) {
    this.operations.push({ name, action, rollback });
  }

  async commit() {
    if (this.committed) throw new Error('Transaction already committed');
    this.committed = true;
    const results = [];
    for (let i = 0; i < this.operations.length; i++) {
      const op = this.operations[i];
      try {
        const result = await op.action();
        results.push(result);
      } catch (err) {
        for (let j = i - 1; j >= 0; j--) {
          try { await this.operations[j].rollback(); } catch (rb) { console.error(`[Transaction] rollback failed for ${this.operations[j].name}:`, rb); }
        }
        throw err;
      }
    }
    return results;
  }
}

export async function transaction(fn) {
  const tx = new Transaction();
  await fn(tx);
  return tx.commit();
}

// displayOrder — shared helpers that keep master-data lists in a stable,
// human-readable 1..N order. The database returns rows in no guaranteed order,
// so every list is sorted client-side by `display_order`. These helpers make
// that order deterministic (with a created_at/id tie-break) and self-healing
// (gaps left by deletes are renumbered to a clean 1..N on the next load).

function createdKey(row) {
  return row?.created_at || row?.createdAt || '';
}

// Deterministic sort: display_order first, then creation time, then id.
// Guarantees the same visual order regardless of the order the DB hands rows back.
export function orderComparator(a, b) {
  const ao = Number.isFinite(a?.display_order) ? a.display_order : Number.POSITIVE_INFINITY;
  const bo = Number.isFinite(b?.display_order) ? b.display_order : Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  const ac = createdKey(a);
  const bc = createdKey(b);
  if (ac !== bc) return ac < bc ? -1 : 1;
  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
}

// The next order value for a newly created row (append to the end): max + 1.
export function nextDisplayOrder(rows = []) {
  return rows.reduce((m, r) => Math.max(m, Number.isFinite(r?.display_order) ? r.display_order : 0), 0) + 1;
}

// Assign a clean 1..N sequence and persist only the rows that changed.
// When `groupBy` is given (e.g. 'parent_id' for the court tree), each group is
// numbered 1..N independently. Returns the rows sorted by the final order.
export async function normalizeDisplayOrder(rows = [], updateFn, { groupBy } = {}) {
  const groups = new Map();
  if (groupBy) {
    for (const r of rows) {
      const key = r?.[groupBy] ?? '__root__';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
  } else {
    groups.set('__all__', [...rows]);
  }

  const changed = new Map(); // id -> new display_order
  for (const arr of groups.values()) {
    arr.sort(orderComparator);
    arr.forEach((row, idx) => {
      const desired = idx + 1;
      if (row.display_order !== desired) changed.set(row.id, desired);
    });
  }

  for (const [id, order] of changed) {
    // eslint-disable-next-line no-await-in-loop
    await updateFn(id, { display_order: order }).catch(() => {});
  }

  const out = rows.map((r) => (changed.has(r.id) ? { ...r, display_order: changed.get(r.id) } : r));
  return out.sort(orderComparator);
}

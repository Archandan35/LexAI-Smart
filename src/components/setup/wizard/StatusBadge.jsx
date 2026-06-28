import React from 'react';

const COLORS = {
  ok: 'var(--green)', warn: 'var(--amber)', fail: 'var(--red)',
  info: 'var(--brand)', pass: 'var(--green)', running: 'var(--brand)',
  queued: 'var(--text-faint)', skipped: 'var(--text-soft)',
};

const BG = {
  ok: 'var(--green-soft)', warn: 'var(--amber-soft)', fail: 'var(--red-soft)',
  info: 'var(--brand-soft)', pass: 'var(--green-soft)', running: 'var(--brand-soft)',
  queued: 'transparent', skipped: 'transparent',
};

export default function StatusBadge({ status, label, size }) {
  const c = COLORS[status] || 'var(--text-soft)';
  const b = BG[status] || 'transparent';
  const s = size === 'sm' ? 11 : 12;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: size === 'sm' ? '2px 8px' : '3px 10px', borderRadius: 20,
      fontSize: s, fontWeight: 600, color: c, background: b,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
      {label || status}
    </span>
  );
}

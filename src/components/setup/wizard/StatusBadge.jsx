
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
    <span className={`wizard-badge${size === 'sm' ? ' wizard-badge--sm' : ''}`}
      style={{ fontSize: s, color: c, background: b }}>
      <span className="wizard-badge__dot" style={{ background: c }} />
      {label || status}
    </span>
  );
}

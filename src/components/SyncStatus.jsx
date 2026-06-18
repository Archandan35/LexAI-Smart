import React from 'react';

// SyncStatus — file save/sync indicator.
// 🟢 synced · 🟡 saving/pending · 🔴 error
const MAP = {
  synced: { cls: 'green', label: 'Saved & Synced' },
  saving: { cls: 'amber', label: 'Saving…' },
  pending: { cls: 'amber', label: 'Pending sync' },
  error: { cls: 'red', label: 'Save failed' },
};

export default function SyncStatus({ status = 'synced', dot = false }) {
  const s = MAP[status] || MAP.synced;
  if (dot) return <span className="dot" title={s.label} style={{ background: `var(--${s.cls})` }} />;
  return (
    <span className="syncstatus" title={s.label}>
      <span className="dot" style={{ background: `var(--${s.cls})` }} />
      <span className="syncstatus__label">{s.label}</span>
    </span>
  );
}

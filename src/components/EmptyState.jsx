import React from 'react';
import Icon from './Icon.jsx';

export default function EmptyState({ icon = 'file', title = 'Nothing here yet.', hint, action }) {
  return (
    <div className="empty">
      <div className="empty__icon"><Icon name={icon} size={26} /></div>
      <div style={{ fontWeight: 600, color: 'var(--text-soft)' }}>{title}</div>
      {hint && <div style={{ fontSize: 13, marginTop: 6 }}>{hint}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

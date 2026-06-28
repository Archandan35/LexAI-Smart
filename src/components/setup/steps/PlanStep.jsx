import React from 'react';
import Button from '@/components/Button.jsx';
import StatusBadge from '../wizard/StatusBadge.jsx';

export default function PlanStep({ scanResult, onPlanned, back }) {
  const missing = scanResult?.missing || [];
  const present = scanResult?.present || [];
  const total = missing.length + present.length;

  const sections = [
    { title: 'Existing Components', status: 'ok', items: present, count: present.length },
    { title: 'Missing Components', status: 'fail', items: missing, count: missing.length },
  ];

  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 16 }}>
        Installation plan generated. {total} total component(s) in the blueprint.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sections.map(s => (
          <div key={s.title} style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</span>
              <StatusBadge status={s.status} label={`${s.count} item(s)`} />
            </div>
            {s.items.length > 0 && (
              <div style={{ padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {s.items.map(i => <span key={i} className="tag">{i}</span>)}
              </div>
            )}
            {s.items.length === 0 && (
              <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-faint)' }}>None</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" onClick={() => onPlanned(scanResult)}>
          {missing.length > 0 ? 'Continue to Review' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}

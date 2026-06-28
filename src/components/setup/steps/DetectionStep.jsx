import React, { useEffect, useState } from 'react';
import { ConnectionManager } from '@/services/setup/ConnectionManager.js';
import StatusBadge from '../wizard/StatusBadge.jsx';

export default function DetectionStep({ onDetected, back }) {
  const [detecting, setDetecting] = useState(true);
  const [env, setEnv] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await ConnectionManager.collectEnvironment();
      if (!active) return;
      setEnv(result);
      setDetecting(false);
      if (result.provider !== 'unknown') {
        setTimeout(() => onDetected(result), 1000);
      } else {
        setError('Could not detect provider');
      }
    })();
    return () => { active = false; };
  }, []);

  if (detecting) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="spinner" />
        <p style={{ marginTop: 16, color: 'var(--text-soft)' }}>Detecting environment...</p>
      </div>
    );
  }

  const cards = [
    { label: 'Provider', value: env?.provider || '—', status: env?.provider !== 'unknown' ? 'ok' : 'warn' },
    { label: 'Schema Version', value: `v${env?.version || '?'}`, status: 'info' },
    { label: 'Extensions', value: env?.extensions?.length ? `${env.extensions.length} installed` : 'None detected', status: env?.extensions?.length ? 'ok' : 'info' },
    { label: 'Schemas', value: env?.schemas?.length ? `${env.schemas.length} available` : 'None', status: env?.schemas?.length ? 'ok' : 'info' },
  ];

  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 16 }}>Environment detected. Review the details below.</p>
      {error && <div style={{ padding: 12, borderRadius: 8, background: 'var(--red-soft)', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {cards.map(c => (
          <div key={c.label} style={{ padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{c.value}</span>
              <StatusBadge status={c.status} size="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

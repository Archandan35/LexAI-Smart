import React, { useEffect, useState } from 'react';
import { DatabaseScanner } from '@/services/setup/DatabaseScanner.js';
import Button from '@/components/Button.jsx';
import StatusBadge from '../wizard/StatusBadge.jsx';

export default function AnalysisStep({ onAnalyzed, back }) {
  const [phase, setPhase] = useState('scanning');
  const [scanResult, setScanResult] = useState(null);
  const [validation, setValidation] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setPhase('scanning');
      const scan = await DatabaseScanner.scan((p) => {/* progress */});
      if (!active) return;
      setScanResult(scan);
      if (scan.ok) {
        setPhase('validating');
        const val = await DatabaseScanner.validate();
        if (!active) return;
        setValidation(val);
      }
      setPhase('done');
    })();
    return () => { active = false; };
  }, []);

  if (phase !== 'done') {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="spinner" />
        <p style={{ marginTop: 16, color: 'var(--text-soft)' }}>
          {phase === 'scanning' ? 'Scanning database...' : 'Validating schema...'}
        </p>
      </div>
    );
  }

  const items = [
    { label: 'Tables', count: scanResult?.present?.length || 0, status: 'ok' },
    { label: 'Missing', count: scanResult?.missing?.length || 0, status: scanResult?.missing?.length > 0 ? 'fail' : 'ok' },
    { label: 'Installed', label2: scanResult?.installed ? 'Yes' : 'No', status: scanResult?.installed ? 'ok' : 'warn' },
    { label: 'Schema Valid', label2: validation?.valid ? 'Yes' : validation?.valid === false ? 'No' : '?', status: validation?.valid ? 'ok' : validation?.valid === false ? 'fail' : 'warn' },
  ];

  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 16 }}>
        Database scan complete. {scanResult?.present?.length} component(s) found, {scanResult?.missing?.length} missing.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {items.map(item => (
          <div key={item.label} style={{ padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 800 }}>{item.label2 || item.count}</span>
              <StatusBadge status={item.status} size="sm" />
            </div>
          </div>
        ))}
      </div>
      {scanResult?.missing?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setExpanded(expanded === 'missing' ? null : 'missing')}
            style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>
            {expanded === 'missing' ? 'Hide' : 'Show'} missing items ({scanResult.missing.length})
          </button>
          {expanded === 'missing' && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {scanResult.missing.map(m => <span key={m} className="tag">{m}</span>)}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" onClick={() => onAnalyzed(scanResult)}>Continue</Button>
      </div>
    </div>
  );
}

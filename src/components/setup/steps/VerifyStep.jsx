import React, { useCallback, useEffect, useState } from 'react';
import { VerificationEngine } from '@/services/setup/VerificationEngine.js';
import { SqlGenerator } from '@/services/setup/SqlGenerator.js';
import StatusBadge from '../wizard/StatusBadge.jsx';
import Button from '@/components/Button.jsx';

export default function VerifyStep({ onVerified, manualSql, back }) {
  const [phase, setPhase] = useState('verifying');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [sqlText, setSqlText] = useState('');

  const runVerify = useCallback(async () => {
    setPhase('verifying');
    setError('');
    const v = await VerificationEngine.verify();
    setResult(v);
    if (v.ok && !v.needsSetup) {
      setPhase('passed');
      setTimeout(() => onVerified(v), 1000);
    } else {
      setPhase('missing');
      const sql = manualSql || SqlGenerator.getInstallationSql(v.missing);
      setSqlText(sql);
    }
  }, [manualSql, onVerified]);

  useEffect(() => {
    let active = true;
    (async () => {
      await runVerify();
    })();
    return () => { active = false; };
  }, []);

  if (phase === 'verifying') {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="spinner" />
        <p style={{ marginTop: 16, color: 'var(--text-soft)' }}>Verifying installation...</p>
      </div>
    );
  }

  if (phase === 'passed') {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
        <h3 style={{ margin: 0, color: 'var(--green)' }}>All checks passed</h3>
        <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>{result?.present?.length} component(s) verified.</p>
      </div>
    );
  }

  const missing = result?.missing || [];

  return (
    <div>
      <div style={{ padding: 14, borderRadius: 'var(--radius-sm)', background: 'var(--amber-soft)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <StatusBadge status="warn" label="Items Missing" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{missing.length} item(s) still need attention</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {missing.map(m => <span key={m} className="tag">{m}</span>)}
        </div>
      </div>
      {error && <div style={{ padding: 12, borderRadius: 8, background: 'var(--red-soft)', color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {sqlText && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>SQL for missing items</span>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(sqlText)}>Copy SQL</Button>
          </div>
          <pre style={{ maxHeight: 180, overflow: 'auto', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 12 }}>{sqlText}</pre>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" icon="refresh" onClick={runVerify}>Verify Again</Button>
      </div>
    </div>
  );
}

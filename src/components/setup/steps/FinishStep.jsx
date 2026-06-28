import React from 'react';
import Button from '@/components/Button.jsx';

export default function FinishStep({ health, onLaunch, onExport, onBackup }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
        <span style={{ fontSize: 28, color: 'var(--green)' }}>✓</span>
      </div>
      <h2 style={{ margin: 0, fontSize: 22 }}>Installation Complete</h2>
      <p style={{ color: 'var(--text-soft)', fontSize: 14, marginTop: 6 }}>LexAI is ready to use.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24, textAlign: 'left' }}>
        <div style={{ padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Provider</div>
          <div style={{ fontWeight: 700 }}>{health?.verification?.provider || '—'}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Schema Version</div>
          <div style={{ fontWeight: 700 }}>v{health?.verification?.version || '?'}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Health Score</div>
          <div style={{ fontWeight: 700, color: health?.overallScore >= 80 ? 'var(--green)' : 'var(--amber)' }}>{health?.overallScore || 0}/100</div>
        </div>
        <div style={{ padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Objects Installed</div>
          <div style={{ fontWeight: 700 }}>{health?.verification?.present?.length || 0}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button variant="primary" icon="arrow" onClick={onLaunch}>Launch LexAI</Button>
        <Button variant="ghost" icon="download" onClick={onExport}>Export Report</Button>
        <Button variant="ghost" icon="upload" onClick={onBackup}>Create Backup</Button>
      </div>
    </div>
  );
}

import React from 'react';
import Button from '@/components/Button.jsx';
import StatusBadge from '../wizard/StatusBadge.jsx';

export default function ReviewStep({ scanResult, sqlText, onInstall, onGenerateSql, back }) {
  const missing = scanResult?.missing || [];
  const hasSql = sqlText && sqlText.trim().length > 0;

  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 16 }}>
        Review the changes that will be made to your database.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--green-soft)' }}>
          <StatusBadge status="ok" label="Will Skip" />
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{scanResult?.present?.length || 0}</div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>Already installed</div>
        </div>
        <div style={{ padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--amber-soft)' }}>
          <StatusBadge status="warn" label="Will Create" />
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{missing.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>New objects</div>
        </div>
      </div>
      {hasSql && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Generated SQL ({sqlText.split('\n').length} lines)</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(sqlText)}>Copy</Button>
              <Button variant="ghost" size="sm" onClick={onGenerateSql}>Download</Button>
            </div>
          </div>
          <pre style={{
            maxHeight: 200, overflow: 'auto', padding: 14, borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 12, lineHeight: 1.5,
          }}>{sqlText}</pre>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" icon="bolt" onClick={onInstall} disabled={missing.length === 0}>
          Install
        </Button>
      </div>
    </div>
  );
}

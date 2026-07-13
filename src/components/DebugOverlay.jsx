import { useState } from 'react';
import { useLogCapture } from '@/components/DebugPanel.jsx';
import { DateEngine } from '@/core/DateEngine.js';

export default function DebugOverlay() {
  const { logs, clearLogs, copyLogs } = useLogCapture();
  const [open, setOpen] = useState(false);
  const hasError = logs.some((l) => l.level === 'error');

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Debug overlay"
        style={{
          position: 'fixed', bottom: 12, right: 12, zIndex: 9999,
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          background: hasError ? '#dc2626' : '#1e293b',
          color: '#fff', cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {hasError ? '!' : '🐛'}
      </button>
    );
  }

  return (
    <div className="debug-overlay__panel">
      <div className="debug-overlay__header">
        <span className="debug-overlay__title">Debug ({logs.length})</span>
        {hasError && <span className="debug-overlay__error-badge">⚠ ERRORS</span>}
        <div className="debug-overlay__header-actions">
          <button onClick={copyLogs} style={btnStyle}>Copy</button>
          <button onClick={clearLogs} style={btnStyle}>Clear</button>
          <button onClick={() => setOpen(false)} style={btnStyle}>Close</button>
        </div>
      </div>
      <div className="debug-overlay__log-area">
        {logs.length === 0 && <span className="debug-overlay__empty-msg">No logs captured.</span>}
        {logs.map((l, i) => (
          <div key={i} style={{
            color: l.level === 'error' ? '#ef4444' : l.level === 'warn' ? '#f59e0b' : '#94a3b8',
            marginBottom: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            <span className="debug-overlay__timestamp">{DateEngine.formatTime(l.t)}</span>
            [{l.level.toUpperCase()}] {l.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

const btnStyle = {
  background: '#334155', border: 'none', color: '#e2e8f0',
  cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4,
};


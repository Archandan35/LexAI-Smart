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
    <div style={{
      position: 'fixed', bottom: 0, right: 0, zIndex: 9999,
      width: 480, maxHeight: '60vh',
      background: '#0f172a', color: '#e2e8f0',
      border: '1px solid #334155', borderRadius: '8px 0 0 0',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'monospace', fontSize: 12,
      boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderBottom: '1px solid #334155',
      }}>
        <span style={{ fontWeight: 600 }}>Debug ({logs.length})</span>
        {hasError && <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠ ERRORS</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button onClick={copyLogs} style={btnStyle}>Copy</button>
          <button onClick={clearLogs} style={btnStyle}>Clear</button>
          <button onClick={() => setOpen(false)} style={btnStyle}>Close</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {logs.length === 0 && <span style={{ color: '#64748b' }}>No logs captured.</span>}
        {logs.map((l, i) => (
          <div key={i} style={{
            color: l.level === 'error' ? '#ef4444' : l.level === 'warn' ? '#f59e0b' : '#94a3b8',
            marginBottom: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            <span style={{ color: '#475569', marginRight: 6 }}>{DateEngine.formatTime(l.t)}</span>
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

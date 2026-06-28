import React, { useState, useRef, useEffect } from 'react';
import Icon from '@/components/Icon.jsx';
import { DateEngine } from '@/core/DateEngine.js';

export function useApiLog() {
  const [entries, setEntries] = useState([]);
  const ref = useRef([]);

  const add = (type, msg, detail) => {
    const entry = {
      id: Date.now() + Math.random(),
      ts: new Date().toISOString(),
      type,
      msg,
      detail: detail || null,
    };
    ref.current = ref.current.concat(entry).slice(-500);
    setEntries([...ref.current]);
  };

  const clear = () => { ref.current = []; setEntries([]); };

  return { entries, add, clear };
}

export default function ApiDebugLog({ entries, onClear }) {
  const [open, setOpen] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current) {
      const threshold = 150;
      const scrollBottom = window.innerHeight + window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollBottom >= docHeight - threshold) {
        endRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [entries]);

  const errorCount = entries.filter((e) => e.type === 'error').length;

  return (
    <div style={{
      marginTop: 16, border: '1px solid var(--border)', borderRadius: 8,
      background: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        borderBottom: '1px solid #334155', cursor: 'pointer', userSelect: 'none',
      }} onClick={() => setOpen((o) => !o)}>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={12} />
        <span style={{ fontWeight: 600 }}>API Debug Log</span>
        <span style={{ color: '#64748b' }}>({entries.length})</span>
        {errorCount > 0 && (
          <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠ {errorCount} error{errorCount > 1 ? 's' : ''}</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {onClear && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              style={{ background: '#334155', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}
            >Clear</button>
          )}
        </div>
      </div>
      {open && (
        <div style={{ maxHeight: 400, overflow: 'auto', padding: 8 }}>
          {entries.length === 0 ? (
            <div style={{ color: '#64748b', padding: 8 }}>No API calls recorded yet.</div>
          ) : entries.map((e) => (
            <div key={e.id} style={{ marginBottom: 4, padding: '4px 6px', borderRadius: 4, background: '#1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#475569', fontSize: 10, whiteSpace: 'nowrap' }}>
                  {DateEngine.formatTime(e.ts, '24h')}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
                  background: e.type === 'error' ? '#450a0a' : e.type === 'warn' ? '#451a03' : e.type === 'success' ? '#052e16' : '#1e293b',
                  color: e.type === 'error' ? '#fca5a5' : e.type === 'warn' ? '#fdba74' : e.type === 'success' ? '#86efac' : '#94a3b8',
                }}>
                  {e.type.toUpperCase()}
                </span>
                <span style={{ wordBreak: 'break-all', color: e.type === 'error' ? '#fca5a5' : '#e2e8f0' }}>{e.msg}</span>
              </div>
              {e.detail && (
                <pre style={{ margin: '4px 0 0 0', fontSize: 10, color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail, null, 2)}
                </pre>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}

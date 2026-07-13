import { useState, useEffect, useRef } from 'react';
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
    <div className="api-debug-log">
      <div className="api-debug-log__header" onClick={() => setOpen((o) => !o)}>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={12} />
        <span className="api-debug-log__title">API Debug Log</span>
        <span className="api-debug-log__count">({entries.length})</span>
        {errorCount > 0 && (
          <span className="api-debug-log__error">⚠ {errorCount} error{errorCount > 1 ? 's' : ''}</span>
        )}
        <div className="api-debug-log__spacer">
          {onClear && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="api-debug-log__clear-btn"
            >Clear</button>
          )}
        </div>
      </div>
      {open && (
        <div className="api-debug-log__body">
          {entries.length === 0 ? (
            <div className="api-debug-log__empty">No API calls recorded yet.</div>
          ) : entries.map((e) => (
            <div key={e.id} className="api-debug-log__entry">
              <div className="api-debug-log__entry-row">
                <span className="api-debug-log__time">
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
                <pre className="api-debug-log__detail">
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


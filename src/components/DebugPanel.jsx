import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import { DateEngine } from '@/core/DateEngine.js';

export function useLogCapture() {
  const [logs, setLogs] = useState([]);
  const logsRef = useRef([]);

  useEffect(() => {
    const origLog = console.log.bind(console);
    const origWarn = console.warn.bind(console);
    const origError = console.error.bind(console);

    const capture = (level, args) => {
      const entry = {
        t: new Date().toISOString(),
        level,
        msg: args.map((a) => {
          if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack}`;
          try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); } catch { return String(a); }
        }).join(' '),
      };
      logsRef.current = logsRef.current.concat(entry).slice(-500);
      setLogs(logsRef.current);
    };

    console.log = (...args) => { capture('log', args); origLog(...args); };
    console.warn = (...args) => { capture('warn', args); origWarn(...args); };
    console.error = (...args) => { capture('error', args); origError(...args); };

    return () => {
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
    };
  }, []);

  const clearLogs = useCallback(() => {
    logsRef.current = [];
    setLogs([]);
  }, []);

  const copyLogs = useCallback(() => {
    const text = logsRef.current.map((l) => `[${l.t}] ${l.level.toUpperCase()} ${l.msg}`).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  }, []);

  return { logs, clearLogs, copyLogs };
}

export default function DebugPanel({ logs, error, result, onClear, onCopy, collapsed: initCollapsed }) {
  const hasError = logs.some((l) => l.level === 'error') || !!error;
  const [collapsed, setCollapsed] = useState(initCollapsed !== false && !hasError);
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
  }, [logs]);

  if (collapsed) {
    const hasError = logs.some((l) => l.level === 'error') || !!error;
    return (
      <div className="dm-mt debug-panel__collapsed-bar">
        <button
          onClick={() => setCollapsed(false)}
          className="debug-panel__toggle-btn"
        >
          <Icon name={hasError ? 'alert' : 'info'} size={12} />
          <span>Debug {hasError ? '(errors)' : ''} — {logs.length} log{logs.length !== 1 ? 's' : ''}</span>
          <span className="debug-panel__toggle-arrow">{'\u25BC'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="dm-mt debug-panel__collapsed-bar">
      <div className="debug-panel__toolbar">
        <button
          onClick={() => setCollapsed(true)}
          className="debug-panel__toggle-expanded"
        >
          <Icon name="info" size={12} />
          <span>Debug Log ({logs.length})</span>
          <span>{'\u25B2'}</span>
        </button>
        <div className="debug-panel__toolbar-actions">
          {onCopy && <Button variant="ghost" size="sm" icon="copy" onClick={onCopy}>Copy</Button>}
          {onClear && <Button variant="ghost" size="sm" icon="close" onClick={onClear}>Clear</Button>}
        </div>
      </div>

      {error && (
        <div className="alert alert--danger debug-panel__alert">
          <Icon name="alert" size={14} />
          <span>{typeof error === 'string' ? error : error?.message || JSON.stringify(error)}</span>
        </div>
      )}

      {result && (
        <div className="alert alert--success debug-panel__alert">
          <Icon name="check" size={14} />
          <span className="debug-panel__result-json">{JSON.stringify(result, null, 2)}</span>
        </div>
      )}

      <pre
        className="debug-panel__log-pre"
      >
        {logs.length === 0 && <span className="debug-panel__empty-msg">No logs captured yet.</span>}
        {logs.map((l, i) => (
          <div key={i} style={{
            color: l.level === 'error' ? 'var(--error)' : l.level === 'warn' ? 'var(--warning)' : 'var(--text)',
            marginBottom: 2,
          }}>
            <span className="debug-panel__log-time">{DateEngine.formatTime(l.t)}</span>
            <span style={{ fontWeight: l.level === 'error' ? 600 : 400 }}>{l.level.toUpperCase()}</span>
            <span>{' '}{l.msg}</span>
          </div>
        ))}
        <div ref={endRef} />
      </pre>
    </div>
  );
}


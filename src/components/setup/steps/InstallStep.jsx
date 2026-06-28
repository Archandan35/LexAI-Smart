import React, { useEffect, useState, useRef, useCallback } from 'react';
import { InstallationExecutor } from '@/services/setup/InstallationExecutor.js';
import { SqlGenerator } from '@/services/setup/SqlGenerator.js';
import StatusBadge from '../wizard/StatusBadge.jsx';
import ConfirmDialog from '../wizard/ConfirmDialog.jsx';

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function InstallStep({ scanResult, onInstalled, onManualSql }) {
  const [phase, setPhase] = useState('preparing');
  const [progress, setProgress] = useState({ pct: 0, label: 'Preparing...' });
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const [confirmBack, setConfirmBack] = useState(false);
  const logRef = useRef(null);
  const startRef = useRef(null);
  const timerRef = useRef(null);

  const addLog = useCallback((msg, status = 'info') => {
    setLogs(prev => [...prev, { msg, status, time: new Date().toLocaleTimeString() }]);
  }, []);

  useEffect(() => {
    let active = true;
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (active) setElapsed((Date.now() - startRef.current) / 1000);
    }, 1000);

    (async () => {
      addLog('Generating installation SQL...');
      const sql = SqlGenerator.getInstallationSql(scanResult?.missing);
      if (!sql) {
        addLog('No SQL generated', 'fail');
        if (active) { setPhase('failed'); setResult({ ok: false, error: 'No SQL generated' }); }
        return;
      }
      addLog(`SQL generated (${sql.split('\n').length} lines)`);
      setPhase('executing');
      setProgress({ pct: 10, label: 'Executing installation SQL...' });

      const res = await InstallationExecutor.executeAll(sql, (p) => {
        if (!active) return;
        setProgress({ pct: p.pct, label: p.label });
        addLog(p.label);
      });

      if (!active) return;
      setResult(res);
      if (res.ok) {
        addLog('Installation complete', 'ok');
        setPhase('done');
        setTimeout(() => onInstalled(res), 1200);
      } else if (res.needsManual) {
        addLog('Manual SQL execution required', 'warn');
        setPhase('manual');
        if (onManualSql) onManualSql(sql);
      } else {
        addLog(`Installation failed: ${res.error}`, 'fail');
        setPhase('failed');
      }
    })();

    return () => {
      active = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const remaining = progress.pct > 0 && elapsed > 3
    ? Math.round((elapsed / progress.pct) * (100 - progress.pct))
    : null;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Installation Progress</span>
          <StatusBadge status={
            phase === 'done' ? 'ok' : phase === 'failed' ? 'fail' : phase === 'manual' ? 'warn' : 'running'
          } label={
            phase === 'preparing' ? 'Preparing' : phase === 'executing' ? 'Installing...' : phase === 'done' ? 'Complete' : phase === 'failed' ? 'Failed' : 'Manual Required'
          } />
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress.pct}%`, background: phase === 'failed' ? 'var(--red)' : phase === 'done' ? 'var(--green)' : 'var(--brand)', borderRadius: 4, transition: 'width 0.4s var(--ease)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
          <span style={{ color: 'var(--text-soft)' }}>{progress.label}</span>
          {phase === 'executing' && (
            <span style={{ color: 'var(--text-faint)' }}>
              {fmtTime(elapsed)}
              {remaining !== null && remaining > 0 && ` / ~${fmtTime(remaining)} remaining`}
            </span>
          )}
        </div>
      </div>

      <button onClick={() => setShowLogs(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, border: 'none',
          background: 'transparent', cursor: 'pointer', color: 'var(--text-soft)',
          fontSize: 12, fontWeight: 600, padding: '4px 0', marginBottom: 6,
        }}
        aria-expanded={showLogs}
      >
        {showLogs ? '▼' : '▶'} {showLogs ? 'Hide' : 'Show'} Execution Log
      </button>

      {showLogs && (
        <div ref={logRef} style={{
          maxHeight: 240, overflow: 'auto', padding: 12, borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)', background: 'var(--navy-900)', color: '#b4c2e0',
          fontSize: 12, fontFamily: 'monospace', lineHeight: 1.7,
          transition: 'max-height 0.3s var(--ease)',
        }}>
          {logs.map((l, i) => (
            <div key={i} style={{ color: l.status === 'ok' ? 'var(--green)' : l.status === 'fail' ? 'var(--red)' : l.status === 'warn' ? 'var(--amber)' : '#b4c2e0' }}>
              <span style={{ opacity: 0.6 }}>[{l.time}]</span> {l.msg}
            </div>
          ))}
        </div>
      )}

      {phase === 'failed' && result && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 'var(--radius-sm)', background: 'var(--red-soft)' }}>
          <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>Installation Failed</div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>{result.error}</div>
        </div>
      )}
      {phase === 'manual' && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 'var(--radius-sm)', background: 'var(--amber-soft)' }}>
          <div style={{ fontWeight: 600, color: 'var(--amber)', marginBottom: 4 }}>Manual SQL Required</div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>Copy the SQL above and run it in your database SQL editor, then click Verify.</div>
        </div>
      )}

      <ConfirmDialog
        open={confirmBack}
        title="Go Back?"
        message="If you go back, the current installation progress will be lost. Are you sure you want to cancel installation?"
        confirmLabel="Go Back"
        variant="danger"
        onConfirm={() => { setConfirmBack(false); /* parent handles back */ }}
        onCancel={() => setConfirmBack(false)}
      />
    </div>
  );
}

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
      <div className="wizard-progress">
        <div className="wizard-progress__header">
          <span className="wizard-progress__title">Installation Progress</span>
          <StatusBadge status={
            phase === 'done' ? 'ok' : phase === 'failed' ? 'fail' : phase === 'manual' ? 'warn' : 'running'
          } label={
            phase === 'preparing' ? 'Preparing' : phase === 'executing' ? 'Installing...' : phase === 'done' ? 'Complete' : phase === 'failed' ? 'Failed' : 'Manual Required'
          } />
        </div>
        <div className="wizard-progress__track">
          <div className="wizard-progress__fill"
            style={{
              width: `${progress.pct}%`,
              background: phase === 'failed' ? 'var(--red)' : phase === 'done' ? 'var(--green)' : 'var(--brand)',
            }} />
        </div>
        <div className="wizard-progress__info">
          <span className="wizard-progress__label">{progress.label}</span>
          {phase === 'executing' && (
            <span className="wizard-progress__time">
              {fmtTime(elapsed)}
              {remaining !== null && remaining > 0 && ` / ~${fmtTime(remaining)} remaining`}
            </span>
          )}
        </div>
      </div>

      <button onClick={() => setShowLogs(c => !c)}
        className="wizard-log-toggle"
        aria-expanded={showLogs}
      >
        {showLogs ? '▼' : '▶'} {showLogs ? 'Hide' : 'Show'} Execution Log
      </button>

      {showLogs && (
        <div ref={logRef} className="wizard-log">
          {logs.map((l, i) => (
            <div key={i} style={{
              color: l.status === 'ok' ? 'var(--green)' : l.status === 'fail' ? 'var(--red)' : l.status === 'warn' ? 'var(--amber)' : '#b4c2e0',
            }}>
              <span className="wizard-log__time">[{l.time}]</span> {l.msg}
            </div>
          ))}
        </div>
      )}

      {phase === 'failed' && result && (
        <div className="wizard-alert-box wizard-alert-box--red wizard-alert-box--mt">
          <div className="wizard-alert-title">Installation Failed</div>
          <div className="wizard-alert-text">{result.error}</div>
        </div>
      )}
      {phase === 'manual' && (
        <div className="wizard-alert-box wizard-alert-box--amber wizard-alert-box--mt">
          <div className="wizard-alert-title wizard-alert-title--amber">Manual SQL Required</div>
          <div className="wizard-alert-text">Copy the SQL above and run it in your database SQL editor, then click Verify.</div>
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

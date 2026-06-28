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
      <div className="wizard-center wizard-center--lg">
        <div className="spinner" />
        <p className="wizard-loading-text">Verifying installation...</p>
      </div>
    );
  }

  if (phase === 'passed') {
    return (
      <div className="wizard-center wizard-center--sm">
        <div className="wizard-check">✓</div>
        <h3 className="wizard-title--green">All checks passed</h3>
        <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>{result?.present?.length} component(s) verified.</p>
      </div>
    );
  }

  const missing = result?.missing || [];

  return (
    <div>
      <div className="wizard-alert-items">
        <div className="wizard-alert-items__header">
          <StatusBadge status="warn" label="Items Missing" />
          <span className="wizard-alert-items__title">{missing.length} item(s) still need attention</span>
        </div>
        <div className="wizard-tag-list">
          {missing.map(m => <span key={m} className="tag">{m}</span>)}
        </div>
      </div>
      {error && <div className="wizard-alert-box wizard-alert-box--red wizard-alert-box--sm wizard-alert-box--mb-sm">{error}</div>}
      {sqlText && (
        <div className="wizard-sql-section">
          <div className="wizard-sql-header" style={{ marginBottom: 6 }}>
            <span className="wizard-sql-title">SQL for missing items</span>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(sqlText)}>Copy SQL</Button>
          </div>
          <pre className="wizard-sql-block wizard-sql-block--sm">{sqlText}</pre>
        </div>
      )}
      <div className="wizard-actions">
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" icon="refresh" onClick={runVerify}>Verify Again</Button>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { DatabaseScanner } from '@/services/setup/DatabaseScanner.js';
import Button from '@/components/Button.jsx';
import StatusBadge from '../wizard/StatusBadge.jsx';

export default function AnalysisStep({ onAnalyzed, back }) {
  const [phase, setPhase] = useState('scanning');
  const [scanResult, setScanResult] = useState(null);
  const [validation, setValidation] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setPhase('scanning');
      const scan = await DatabaseScanner.scan((p) => {/* progress */});
      if (!active) return;
      setScanResult(scan);
      if (scan.ok) {
        setPhase('validating');
        const val = await DatabaseScanner.validate();
        if (!active) return;
        setValidation(val);
      }
      setPhase('done');
    })();
    return () => { active = false; };
  }, []);

  if (phase !== 'done') {
    return (
      <div className="wizard-center wizard-center--lg">
        <div className="spinner" />
        <p className="wizard-loading-text">
          {phase === 'scanning' ? 'Scanning database...' : 'Validating schema...'}
        </p>
      </div>
    );
  }

  const items = [
    { label: 'Tables', count: scanResult?.present?.length || 0, status: 'ok' },
    { label: 'Missing', count: scanResult?.missing?.length || 0, status: scanResult?.missing?.length > 0 ? 'fail' : 'ok' },
    { label: 'Installed', label2: scanResult?.installed ? 'Yes' : 'No', status: scanResult?.installed ? 'ok' : 'warn' },
    { label: 'Schema Valid', label2: validation?.valid ? 'Yes' : validation?.valid === false ? 'No' : '?', status: validation?.valid ? 'ok' : validation?.valid === false ? 'fail' : 'warn' },
  ];

  const blocked = scanResult?.blocked?.length || 0;

  return (
    <div>
      {blocked > 0 && (
        <div className="wizard-alert-box wizard-alert-box--amber wizard-alert-box--mb" role="alert">
          <div className="wizard-alert-title wizard-alert-title--amber">Cannot fully verify database</div>
          <div className="wizard-alert-text">
            {scanResult?.error || `${blocked} table(s) could not be checked because requests are being blocked or throttled (e.g. Supabase egress/rate limit exceeded).`} These are NOT necessarily missing — retry after the limit resets or upgrade your plan.
          </div>
        </div>
      )}
      <p className="wizard-desc">
        Database scan complete. {scanResult?.present?.length} component(s) found, {scanResult?.missing?.length} missing{blocked > 0 ? `, ${blocked} unverifiable` : ''}.
      </p>
      <div className="wizard-info-grid">
        {items.map(item => (
          <div key={item.label} className="wizard-info-card">
            <div className="wizard-info-card__label">{item.label}</div>
            <div className="wizard-info-card__row">
              <span className="wizard-info-card__value wizard-info-card__value--lg">{item.label2 || item.count}</span>
              <StatusBadge status={item.status} size="sm" />
            </div>
          </div>
        ))}
      </div>
      {scanResult?.missing?.length > 0 && (
        <div className="u-mt-16">
          <button onClick={() => setExpanded(expanded === 'missing' ? null : 'missing')}
            className="wizard-missing-toggle">
            {expanded === 'missing' ? 'Hide' : 'Show'} missing items ({scanResult.missing.length})
          </button>
          {expanded === 'missing' && (
            <div className="wizard-tag-list u-mt-8">
              {scanResult.missing.map(m => <span key={m} className="tag">{m}</span>)}
            </div>
          )}
        </div>
      )}
      <div className="wizard-actions u-mt-24">
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" onClick={() => onAnalyzed(scanResult)}>Continue</Button>
      </div>
    </div>
  );
}


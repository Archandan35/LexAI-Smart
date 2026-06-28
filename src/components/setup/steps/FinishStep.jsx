import Button from '@/components/Button.jsx';

export default function FinishStep({ health, onLaunch, onExport, onBackup }) {
  return (
    <div className="wizard-finish">
      <div className="wizard-finish__icon">
        <span className="wizard-finish__check">✓</span>
      </div>
      <h2 className="wizard-finish__title">Installation Complete</h2>
      <p className="wizard-finish__sub">LexAI is ready to use.</p>
      <div className="wizard-finish-grid">
        <div className="wizard-finish-item">
          <div className="wizard-finish-item__label">Provider</div>
          <div className="wizard-finish-item__value">{health?.verification?.provider || '—'}</div>
        </div>
        <div className="wizard-finish-item">
          <div className="wizard-finish-item__label">Schema Version</div>
          <div className="wizard-finish-item__value">v{health?.verification?.version || '?'}</div>
        </div>
        <div className="wizard-finish-item">
          <div className="wizard-finish-item__label">Health Score</div>
          <div className="wizard-finish-item__value" style={{ color: health?.overallScore >= 80 ? 'var(--green)' : 'var(--amber)' }}>{health?.overallScore || 0}/100</div>
        </div>
        <div className="wizard-finish-item">
          <div className="wizard-finish-item__label">Objects Installed</div>
          <div className="wizard-finish-item__value">{health?.verification?.present?.length || 0}</div>
        </div>
      </div>
      <div className="wizard-finish__actions">
        <Button variant="primary" icon="arrow" onClick={onLaunch}>Launch LexAI</Button>
        <Button variant="ghost" icon="download" onClick={onExport}>Export Report</Button>
        <Button variant="ghost" icon="upload" onClick={onBackup}>Create Backup</Button>
      </div>
    </div>
  );
}

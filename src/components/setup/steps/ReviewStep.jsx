import { useToast } from '@/data-layer/ToastContext.jsx';
import Button from '@/components/Button.jsx';
import StatusBadge from '../wizard/StatusBadge.jsx';

export default function ReviewStep({ scanResult, sqlText, onInstall, onGenerateSql, back }) {
  const toast = useToast();
  const missing = scanResult?.missing || [];
  const hasSql = sqlText && sqlText.trim().length > 0;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sqlText);
      toast.success('SQL copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, [sqlText, toast]);

  return (
    <div className="wizard-step">
      <p className="wizard-desc">
        Review the changes that will be made to your database.
      </p>
      <div className="wizard-summary-grid">
        <div className="wizard-summary-card wizard-summary-card--green">
          <StatusBadge status="ok" label="Will Skip" />
          <div className="wizard-summary-card__value">{scanResult?.present?.length || 0}</div>
          <div className="wizard-summary-card__label">Already installed</div>
        </div>
        <div className="wizard-summary-card wizard-summary-card--amber">
          <StatusBadge status="warn" label="Will Create" />
          <div className="wizard-summary-card__value">{missing.length}</div>
          <div className="wizard-summary-card__label">New objects</div>
        </div>
      </div>
      {hasSql && (
        <div className="wizard-sql-section">
          <div className="wizard-sql-header">
            <span className="wizard-sql-title">Generated SQL ({sqlText.split('\n').length} lines)</span>
            <div className="wizard-sql-actions">
              <Button variant="ghost" size="sm" onClick={handleCopy}>Copy</Button>
              <Button variant="ghost" size="sm" onClick={onGenerateSql}>Download</Button>
            </div>
          </div>
          <pre className="wizard-sql-block">{sqlText}</pre>
        </div>
      )}
      <div className="wizard-actions">
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" icon="bolt" onClick={onInstall} disabled={missing.length === 0}>
          Install
        </Button>
      </div>
    </div>
  );
}

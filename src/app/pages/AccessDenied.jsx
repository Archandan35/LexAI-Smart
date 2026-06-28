import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import { MODULE_MAP } from '@/constants/permissions.js';
import DebugPanel, { useLogCapture } from '@/components/DebugPanel.jsx';

export default function AccessDenied() {
  const { logs, clearLogs, copyLogs } = useLogCapture();
  const nav = useNavigate();
  const { state } = useLocation();
  const moduleLabel = state?.module ? (MODULE_MAP[state.module]?.label || state.module) : null;

  return (
    <div className="fade-in access-denied__center">
      <div className="access-denied__content">
        <div className="empty__icon access-denied__icon">
          <Icon name="lock" size={32} />
        </div>
        <h1 className="access-denied__title">Access denied</h1>
        <p className="access-denied__text">
          You don’t have permission to view {moduleLabel ? <b>{moduleLabel}</b> : 'this page'}.
          Contact an administrator if you believe this is a mistake.
        </p>
        <div className="access-denied__actions">
          <Button variant="ghost" icon="arrow" onClick={() => nav(-1)}>Go back</Button>
          <Button variant="primary" icon="grid" onClick={() => nav('/')}>Dashboard</Button>
        </div>
        <DebugPanel logs={logs} onClear={clearLogs} onCopy={copyLogs} />
      </div>
    </div>
  );
}

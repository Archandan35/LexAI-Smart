import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { BackendHealthMonitor } from '@/backend/BackendHealthMonitor.js';
import { backendConfig } from '@/config/backend.js';

export default function BackendStatusPanel() {
  const [status, setStatus] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [checking, setChecking] = useState(true);

  const runCheck = async () => {
    setChecking(true);
    const result = await BackendHealthMonitor.diagnose();
    setStatus(result.status);
    setDiagnostics(result.diagnostics);
    setChecking(false);
  };

  useEffect(() => { runCheck(); }, []);

  if (checking) {
    return (
      <div className="dm-mt">
        <div className="kv"><span>Backend API</span><span className="muted">Checking…</span></div>
      </div>
    );
  }

  if (!status) return null;

  const iconName = status.reachable ? 'check' : status.configured ? 'alert' : 'ban';
  const iconCls = status.reachable ? 'alert--success' : 'alert--warn';

  return (
    <div className="dm-mt">
      <div className={`alert ${iconCls}`} style={{ marginBottom: 0 }}>
        <Icon name={iconName} size={16} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
            {status.reachable ? 'Backend Connected' : status.configured ? 'Backend Unreachable' : 'Backend Not Configured'}
          </div>
          <div style={{ fontSize: 12, color: status.reachable ? 'var(--green)' : 'var(--text-faint)' }}>
            {status.reachable
              ? `v${status.version} · ${status.providerLabel} · ${backendConfig.url}`
              : status.error}
          </div>
        </div>
        <button className="iconbtn" onClick={runCheck} title="Re-check">
          <Icon name="refresh" size={14} />
        </button>
      </div>
      {status.reachable && (
        <div className="kv dm-mt" style={{ borderTop: '1px solid var(--border)', marginTop: 8, fontSize: 12.5 }}>
          <span>API Base</span><span className="muted" style={{ fontSize: 11.5 }}>{backendConfig.base}</span>
        </div>
      )}
      {diagnostics.length > 0 && !status.reachable && status.configured && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-soft)' }}>
          {diagnostics.filter((d) => d.type !== 'success').map((d, i) => (
            <div key={i} style={{ padding: '4px 0', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ color: d.type === 'error' ? 'var(--red)' : 'var(--amber)', flexShrink: 0 }}>{d.type === 'error' ? '•' : '!'}</span>
              <span>{d.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

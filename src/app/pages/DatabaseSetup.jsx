import React, { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import Spinner from '@/components/Spinner.jsx';
import { databaseManagerLogic } from '@/logic/databaseManagerLogic.js';

// DatabaseSetup — the first-run wizard shown when no schema is installed on the
// active provider. Reuses the existing auth-shell styling (no inline/JSX CSS).
export default function DatabaseSetup() {
  const [detect, setDetect] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sql, setSql] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const res = await databaseManagerLogic.detect();
    if (res.ok) setDetect(res.value); else setError(res.error || 'Detection failed.');
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const install = async () => {
    setBusy(true); setError(''); setSql('');
    const res = await databaseManagerLogic.install(null);
    setBusy(false);
    if (!res.ok) { setError(res.error || 'Install failed.'); return; }
    if (res.value.needsManual) { setSql(res.value.sql || ''); setError(res.value.reason || ''); await refresh(); return; }
    window.location.href = '/bootstrap-admin';
  };

  return (
    <div className="auth-shell">
      <div className="auth-card fade-in">
        <div className="auth-brand">
          <div className="sidebar__logo">⚖</div>
          <div>
            <div className="auth-brand-title">Lex<span>AI</span></div>
            <div className="sidebar__sub">Database Setup</div>
          </div>
        </div>

        <h1 className="auth-title">Set up your database</h1>
        <p className="auth-sub">No schema was detected on the active provider. Install it to begin.</p>

        {!detect ? <Spinner /> : (
          <>
            <div className="kv"><span>Provider</span><b className="dm-capitalize">{detect.provider}</b></div>
            <div className="kv"><span>Status</span><span>{detect.installed ? `Installed (v${detect.version})` : 'Not installed'}</span></div>
            <div className="kv"><span>Missing collections</span><span>{detect.missing?.length || 0} / {(detect.present?.length || 0) + (detect.missing?.length || 0)}</span></div>
          </>
        )}

        {error && <div className="alert alert--warn dm-mt"><Icon name="alert" size={16} /><span>{error}</span></div>}

        {sql && (
          <div className="dm-mt">
            <div className="auth-sub">Run this once in your provider's SQL editor, then re-check:</div>
            <pre className="code-block">{sql}</pre>
          </div>
        )}

        <div className="dm-toolbar-mt">
          {sql
            ? <Button variant="primary" className="btn--block" icon="refresh" loading={busy} onClick={refresh}>I've run it — Re-check</Button>
            : <Button variant="primary" className="btn--block" icon="database" loading={busy} onClick={install}>Install Database</Button>}
        </div>

        <div className="auth-note">
          Local installs automatically. Firebase / MongoDB create collections on first write. Supabase needs its SQL run once (or an <code>exec_sql</code> RPC for one-click install).
        </div>
      </div>
    </div>
  );
}

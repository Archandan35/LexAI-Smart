import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import Spinner from '@/components/Spinner.jsx';
import { databaseManagerLogic } from '@/logic/databaseManagerLogic.js';

const STEPS = [
  'Detect Provider',
  'Create schema_meta',
  'Create users',
  'Create roles',
  'Create permissions',
  'Create settings',
  'Create cases',
  'Create documents',
  'Create auditLogs',
  'Seed data',
];

export default function DatabaseSetup({ detectError: propDetectError }) {
  const [detect, setDetect] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sql, setSql] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ step: 0, total: 1, label: '' });
  const [result, setResult] = useState(null);
  const [sqlCopied, setSqlCopied] = useState(false);
  const fileRef = useRef(null);

  const refresh = useCallback(async () => {
    setError('');
    const res = await databaseManagerLogic.detect();
    if (res.ok) {
      const d = res.data;
      setDetect(d);
      if (d.authError) {
        setError(`Auth error: ${d.authError}. Verify VITE_SUPABASE_ANON_KEY in your Railway environment variables.`);
      }
      if (d.partialInstall) {
        // Tables exist but not seeded — clear SQL so user sees "Complete Installation"
        setSql('');
        setResult(null);
      }
    } else {
      setError(res.error || 'Detection failed.');
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Re-check after manual SQL by re-running detect
  useEffect(() => {
    if (result?.needsManual && detect?.installed) {
      // Schema now detected — redirect to bootstrap
      window.location.href = '/bootstrap-admin';
    }
  }, [result, detect]);

  const onProgress = useCallback((p) => {
    setProgress(p);
    setError('');
  }, []);

  const install = async () => {
    setBusy(true);
    setError('');
    setSql('');
    setResult(null);
    setProgress({ step: 0, total: STEPS.length, label: 'Detect Provider' });

    let res;
    try {
      res = await databaseManagerLogic.install(null, onProgress);
    } catch (e) {
      setBusy(false);
      setError(e?.message || 'Install failed unexpectedly.');
      return;
    }
    setBusy(false);

    if (!res) {
      setError('No response from installer.');
      return;
    }
    if (!res.ok) {
      setError(res.error || 'Install failed.');
      return;
    }

    const v = res.data;
    if (!v) {
      setError('Install returned empty result.');
      return;
    }

    setResult(v);

    if (v.needsManual) {
      setSql(v.sql || '');
      setError(v.reason || '');
      return;
    }

    if (v.installed) {
      window.location.href = '/bootstrap-admin';
      return;
    }

    setError(v.error || 'Install did not complete.');
  };

  const handleRetry = () => {
    setError('');
    install();
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    } catch {
      setError('Could not copy — select and copy manually.');
    }
  };

  const handleDownloadSql = () => {
    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lexai_schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const pct = progress.total > 0 ? Math.round((progress.step / progress.total) * 100) : 0;

  return (
    <div className="auth-shell">
      <div className="auth-card fade-in">
        <div className="auth-brand">
          <div className="sidebar__logo">&#x2696;</div>
          <div>
            <div className="auth-brand-title">Lex<span>AI</span></div>
            <div className="sidebar__sub">Database Setup</div>
          </div>
        </div>

        <h1 className="auth-title">Set up your database</h1>
        <p className="auth-sub">No schema was detected on the active provider. Install it to begin.</p>

        {!detect ? <Spinner /> : (
          <div className="db-setup__meta">
            <div className="kv"><span>Provider</span><b className="dm-capitalize">{detect.provider}</b></div>
            <div className="kv"><span>Status</span><span>{detect.installed ? `Installed (v${detect.version})` : 'Not installed'}</span></div>
            <div className="kv"><span>Missing collections</span><span>{detect.missing?.length || 0} / {(detect.present?.length || 0) + (detect.missing?.length || 0)}</span></div>
          </div>
        )}

        {/* --- Progress bar (only while installing) --- */}
        {busy && (
          <div className="db-setup__progress dm-mt">
            <div className="db-setup__progress-bar">
              <div className="db-setup__progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="db-setup__progress-label">
              {progress.label ? `Step ${Math.min(progress.step, progress.total)}/${progress.total}: ${progress.label}` : 'Starting...'}
              <span className="db-setup__progress-pct"> ({pct}%)</span>
            </div>
          </div>
        )}

        {/* --- Steps list (live) --- */}
        {busy && (
          <div className="db-setup__steps dm-mt">
            {STEPS.map((label, i) => {
              const idx = i + 1;
              let cls = 'db-setup__step';
              let icon = null;
              if (progress.step > idx) {
                cls += ' db-setup__step--done';
                icon = <Icon name="check" size={14} />;
              } else if (progress.step === idx) {
                cls += ' db-setup__step--active';
                icon = <Spinner />;
              } else {
                cls += ' db-setup__step--pending';
              }
              return (
                <div key={label} className={cls}>
                  <span className="db-setup__step-icon">{icon || <span className="db-setup__step-num">{idx}</span>}</span>
                  <span className="db-setup__step-label">{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* --- Auth / detect error banner (from SetupGate) --- */}
        {propDetectError && (
          <div className="alert alert--warn dm-mt">
            <Icon name="alert" size={16} />
            <span>{propDetectError}</span>
          </div>
        )}

        {/* --- Error banner --- */}
        {error && (
          <div className="alert alert--warn dm-mt">
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* --- Failed step detail --- */}
        {result && !result.needsManual && !result.installed && (
          <div className="alert alert--warn dm-mt">
            <Icon name="alert" size={16} />
            <span>
              Failed at <b>{result.failedStep || 'unknown'}</b>
              {result.error ? `: ${result.error}` : ''}
            </span>
          </div>
        )}

        {/* --- Partial install banner --- */}
        {detect?.partialInstall && !busy && !sql && (
          <div className="alert alert--info dm-mt">
            <Icon name="check" size={16} />
            <span>Tables are created. Click "Complete Installation" to seed roles, permissions, and stamp the schema version.</span>
          </div>
        )}

        {/* --- SQL display (Supabase) --- */}
        {sql && (
          <div className="dm-mt">
            <div className="auth-sub">Run this once in your provider's SQL editor, then click "I've run it":</div>
            <pre className="code-block db-setup__sql">{sql}</pre>
            <div className="toolbar-row dm-mt">
              <Button variant="ghost" icon="copy" size="sm" onClick={handleCopySql}>
                {sqlCopied ? 'Copied!' : 'Copy SQL'}
              </Button>
              <Button variant="ghost" icon="download" size="sm" onClick={handleDownloadSql}>
                Download schema.sql
              </Button>
              <Button variant="ghost" icon="external-link" size="sm"
                onClick={() => window.open('https://supabase.com/dashboard/project/_/sql/new', '_blank', 'noopener')}>
                Open SQL Editor
              </Button>
            </div>
          </div>
        )}

        {/* --- Action buttons --- */}
        <div className="dm-toolbar-mt">
          {busy ? (
            <Button variant="ghost" className="btn--block" icon="x" onClick={() => window.location.reload()}>
              Cancel
            </Button>
          ) : sql ? (
            <Button variant="primary" className="btn--block" icon="refresh" onClick={refresh}>
              I've run it — Re-check
            </Button>
          ) : detect?.partialInstall ? (
            <Button variant="primary" className="btn--block" icon="bolt" loading={busy} onClick={install}>
              Complete Installation
            </Button>
          ) : result && !result.installed ? (
            <Button variant="primary" className="btn--block" icon="refresh" onClick={handleRetry}>
              Retry Installation
            </Button>
          ) : (
            <Button variant="primary" className="btn--block" icon="database" loading={busy} onClick={install}>
              Install Database
            </Button>
          )}
        </div>

        <div className="auth-note">
          Local installs automatically. Firebase / MongoDB create collections on first write. Supabase needs its SQL run once.
        </div>
      </div>
    </div>
  );
}

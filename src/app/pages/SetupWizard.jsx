import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import Spinner from '@/components/Spinner.jsx';
import { Field, Input } from '@/components/Field.jsx';
import { databaseManagerLogic } from '@/logic/databaseManagerLogic.js';
import { InstallationPlanner } from '@/installer-engine/InstallationPlanner.js';
import { InstallationExecutor } from '@/installer-engine/InstallationExecutor.js';
import { ConnectionTester } from '@/installer-engine/ConnectionTester.js';
import { ValidationEngine } from '@/installer-engine/ValidationEngine.js';
import { UploadAnalyzer } from '@/installer-engine/UploadAnalyzer.js';
import BackendStatusPanel from '@/components/BackendStatusPanel.jsx';
import { backendConfig } from '@/config/backend.js';
import { getDatabaseProvider } from '@/providers/database/index.js';

const METHODS = [
  { id: 'simple', icon: 'bolt', label: 'Simple Setup', desc: 'Project URL + API key — ideal for Supabase' },
  { id: 'advanced', icon: 'gear', label: 'Advanced Setup', desc: 'Direct database credentials — power users' },
  { id: 'copy', icon: 'copy', label: 'Copy-Paste Setup', desc: 'Generate SQL for manual execution' },
  { id: 'upload', icon: 'upload', label: 'Database Upload', desc: 'Restore from .udb, SQL, or JSON file' },
];

const STEPS_SIMPLE = ['Connect', 'Validate', 'Detect Schema', 'Generate Plan', 'Install', 'Verify', 'Ready'];
const STEPS_ADVANCED = ['Connect', 'Test Connection', 'Detect Engine', 'Install', 'Seed', 'Verify', 'Ready'];
const STEPS_COPY = ['Analyze', 'Generate SQL', 'Copy SQL', 'Execute SQL', 'Verify', 'Ready'];
const STEPS_UPLOAD = ['Upload', 'Analyze', 'Compare Schema', 'Import', 'Restore', 'Verify', 'Ready'];

function StepIndicator({ steps, current, progress }) {
  return (
    <div className="wizard-steps">
      {steps.map((label, i) => {
        const idx = i + 1;
        let cls = 'wizard-step';
        let icon = null;
        if (progress && progress.step > idx) { cls += ' wizard-step--done'; icon = <Icon name="check" size={13} />; }
        else if (progress && progress.step === idx) { cls += ' wizard-step--active'; icon = <Spinner />; }
        else if (current > idx) { cls += ' wizard-step--done'; icon = <Icon name="check" size={13} />; }
        else if (current === idx) { cls += ' wizard-step--current'; }
        else { cls += ' wizard-step--pending'; }
        return (
          <div key={label} className={cls}>
            <span className="wizard-step__icon">{icon || <span className="wizard-step__num">{idx}</span>}</span>
            <span className="wizard-step__label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function MethodCard({ method, selected, onSelect }) {
  const cls = `wizard-method${selected ? ' wizard-method--selected' : ''}`;
  return (
    <button className={cls} onClick={() => onSelect(method.id)}>
      <span className="wizard-method__icon"><Icon name={method.icon} size={22} /></span>
      <div>
        <div className="wizard-method__title">{method.label}</div>
        <div className="wizard-method__desc">{method.desc}</div>
      </div>
      <span className="wizard-method__radio">{selected ? <Icon name="check" size={16} /> : null}</span>
    </button>
  );
}

export default function SetupWizard({ detectError: propDetectError }) {
  const [method, setMethod] = useState(null);
  const [step, setStep] = useState(1);
  const [detect, setDetect] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [sql, setSql] = useState('');
  const [sqlCopied, setSqlCopied] = useState(false);
  const [plan, setPlan] = useState(null);
  const [installResult, setInstallResult] = useState(null);
  const [validateResult, setValidateResult] = useState(null);
  const [execSqlSupported, setExecSqlSupported] = useState(false);
  const [execSqlBusy, setExecSqlBusy] = useState(false);
  const [execSqlError, setExecSqlError] = useState('');
  const [execSqlDone, setExecSqlDone] = useState(false);
  const fileRef = useRef(null);

  // Simple Setup
  const [projectUrl, setProjectUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');

  // Advanced Setup
  const [advHost, setAdvHost] = useState('');
  const [advPort, setAdvPort] = useState('5432');
  const [advDb, setAdvDb] = useState('');
  const [advUser, setAdvUser] = useState('');
  const [advPassword, setAdvPassword] = useState('');

  // Upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadAnalysis, setUploadAnalysis] = useState(null);

  // Copy-Paste
  const [copySql, setCopySql] = useState('');

  const currentSteps = method === 'simple' ? STEPS_SIMPLE
    : method === 'advanced' ? STEPS_ADVANCED
    : method === 'copy' ? STEPS_COPY
    : method === 'upload' ? STEPS_UPLOAD
    : [];

  const refresh = useCallback(async () => {
    setError('');
    setProgress({ step: 2, total: 7, label: 'Detecting schema...', status: 'working' });
    const res = await databaseManagerLogic.detect((p) => {
      setProgress({ step: 2 + (p.step / p.total) * 0.9, total: 7, label: p.label, status: 'working' });
    });
    if (res.ok) {
      const d = res.data;
      setDetect(d);
      if (d.authError) setError(`Auth error: ${d.authError}.`);
      if (d.partialInstall) setSql('');
      setProgress({ step: 3, total: 7, label: 'Schema detected', status: 'done' });
    } else {
      setError(res.error || 'Detection failed.');
      setProgress(null);
    }
    return res;
  }, []);

  const goToStep = (s) => { setStep(s); setError(''); };

  const handleMethodSelect = (m) => {
    setMethod(m);
    setStep(1);
    setError('');
    setResult(null);
    setSql('');
    setPlan(null);
    setInstallResult(null);
    setValidateResult(null);
    setCopySql('');
    setUploadAnalysis(null);
    setUploadFile(null);
  };

  // --- SIMPLE SETUP ---
  const handleSimpleConnect = async () => {
    if (!projectUrl || !anonKey) { setError('Project URL and Anon Key are required.'); return; }
    setBusy(true); setError(''); setProgress(null);
    try {
      const res = await ConnectionTester.testBackend(projectUrl, anonKey);
      if (!res.ok) { setError(res.error || 'Connection failed.'); setBusy(false); return; }
      goToStep(2);

      setProgress({ step: 2, total: 7, label: 'Detecting schema...', status: 'working' });
      const detectRes = await databaseManagerLogic.detect((p) => {
        setProgress({ step: 2 + (p.step / p.total) * 0.9, total: 7, label: p.label, status: 'working' });
      });

      if (detectRes.ok) {
        setDetect(detectRes.data);
        setProgress({ step: 3, total: 7, label: 'Schema detected', status: 'done' });
        goToStep(3);
        setProgress({ step: 3, total: 7, label: 'Generating installation plan...', status: 'working' });
        const planPromise = InstallationPlanner.plan(detectRes.data);
        const timeout = new Promise((_, r) => setTimeout(() => r(new Error('Plan generation timed out')), 15000));
        const p = await Promise.race([planPromise, timeout]);
        setPlan(p);
        setProgress({ step: 4, total: 7, label: 'Plan ready', status: 'done' });
        goToStep(4);
        if (p.needsManual && p.sql) {
          setSql(p.sql);
          const provider = getDatabaseProvider();
          setExecSqlSupported(typeof provider.execSql === 'function' && p.sql.length > 0);
          setProgress(null);
          goToStep(5);
        } else {
          handleAutoInstall(p);
        }
      } else {
        setError(detectRes.error || 'Detection failed.');
        setProgress(null);
      }
    } catch (e) {
      setError(e?.message || 'Simple Setup failed unexpectedly.');
      setProgress(null);
    }
    setBusy(false);
  };

  const handleAutoInstall = async (p) => {
    setBusy(true); setError(''); setResult(null);
    try {
      const planToRun = p || plan;
      if (!planToRun) { setError('No installation plan.'); setBusy(false); return; }
      const res = await InstallationExecutor.executePlan(planToRun, setProgress);
      if (res.success) {
        setInstallResult(res);
        goToStep(6);
        const v = await ValidationEngine.validateInstallation();
        setValidateResult(v);
        if (v.valid) goToStep(7);
        else { setError(`${v.issueCount} issue${v.issueCount !== 1 ? 's' : ''} found.`); goToStep(6); }
      } else {
        setError(res.error || 'Installation failed.');
        setInstallResult(res);
      }
    } catch (e) {
      setError(e?.message || 'Auto-install failed unexpectedly.');
    }
    setBusy(false);
  };

  // --- ADVANCED SETUP ---
  const handleAdvancedConnect = async () => {
    if (!advHost || !advPort || !advDb || !advUser) { setError('All fields except password are required.'); return; }
    setBusy(true); setError('');
    try {
      const res = await ConnectionTester.testDirect(advHost, advPort, advDb, advUser, advPassword);
      if (!res.ok) { setError(res.error || 'Connection failed. Backend API may be unavailable.'); setBusy(false); return; }
      goToStep(3);
      setBusy(true);
      const p = await InstallationPlanner.plan({ needsSetup: true });
      setPlan(p);
      setBusy(false);
      goToStep(4);
      handleAutoInstall(p);
    } catch (e) {
      setError(e?.message || 'Advanced Setup failed unexpectedly.');
      setBusy(false);
    }
  };

  // --- COPY-PASTE SETUP ---
  const handleGenerateSql = async () => {
    setBusy(true); setError(''); setExecSqlSupported(false); setExecSqlDone(false); setExecSqlError('');
    try {
      const res = await databaseManagerLogic.detect();
      if (!res.ok) { setError(res.error || 'Detection failed.'); setBusy(false); return; }
      const p = await InstallationPlanner.plan(res.data);
      setPlan(p);
      const sqlText = p.sql || '-- No SQL generated for this provider.\n-- Your provider creates collections automatically.';
      setCopySql(sqlText);
      const provider = getDatabaseProvider();
      setExecSqlSupported(typeof provider.execSql === 'function' && sqlText.length > 0);
      goToStep(3);
    } catch (e) {
      setError(e?.message || 'Generation failed.');
    }
    setBusy(false);
  };

  const handleExecuteSql = async () => {
    setExecSqlBusy(true); setExecSqlError(''); setError('');
    try {
      const text = copySql || sql;
      if (!text) { setExecSqlError('No SQL to execute.'); setExecSqlBusy(false); return; }
      const res = await InstallationExecutor.executeSql(text);
      if (!res.ok) {
        setExecSqlError(res.error || 'SQL execution failed.');
        setExecSqlBusy(false);
        return;
      }
      setExecSqlDone(true);
      setExecSqlBusy(false);
      goToStep(5);
      handleVerifySql();
    } catch (e) {
      setExecSqlError(e?.message || 'Execution failed unexpectedly.');
      setExecSqlBusy(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(copySql || sql);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    } catch {
      setError('Could not copy — select and copy manually.');
    }
  };

  const handleDownloadSql = () => {
    const text = copySql || sql;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lexai_schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVerifySql = async () => {
    setBusy(true);
    await refresh();
    const res = await databaseManagerLogic.detect();
    setBusy(false);
    if (res.ok && res.data.installed) {
      goToStep(6);
      const v = await ValidationEngine.validateInstallation();
      setValidateResult(v);
      if (v.valid) goToStep(7);
    } else {
      setError('Installation not detected. Run the SQL and click Verify again.');
    }
  };

  // --- UPLOAD SETUP ---
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadAnalysis(null);
    setError('');
  };

  const handleAnalyzeUpload = async () => {
    if (!uploadFile) { setError('Select a file first.'); return; }
    setBusy(true); setError('');
    try {
      const text = await uploadFile.text();
      const analysis = await UploadAnalyzer.analyze(text);
      setUploadAnalysis(analysis);
      goToStep(3);
      if (analysis.error) { setError(analysis.error); } else { goToStep(4); }
    } catch (e) {
      setError(`Failed to read file: ${e?.message}`);
    }
    setBusy(false);
  };

  const handleImportUpload = async () => {
    if (!uploadAnalysis?.udb) { setError('No valid UDB data to import.'); return; }
    setBusy(true); setError('');
    try {
      const res = await InstallationExecutor.uploadAndImport(uploadAnalysis.udb, setProgress);
      setBusy(false);
      if (res.success) {
        setInstallResult(res);
        goToStep(6);
        const v = await ValidationEngine.validateInstallation();
        setValidateResult(v);
        if (v.valid) goToStep(7);
      } else {
        setError(res.error || 'Import failed.');
      }
    } catch (e) {
      setBusy(false);
      setError(`Import error: ${e?.message}`);
    }
  };

  const handleRetry = () => {
    if (method === 'simple') handleSimpleConnect();
    else if (method === 'advanced') handleAdvancedConnect();
    else if (method === 'copy') handleGenerateSql();
  };

  const handleFinish = () => {
    window.location.href = '/bootstrap-admin';
  };

  const progressPct = progress && progress.total > 0 ? Math.round((progress.step / progress.total) * 100) : 0;

  return (
    <div className="auth-shell">
      <div className={`auth-card${method ? '' : ''}`} style={{ maxWidth: method ? '600px' : '520px' }}>
        <div className="auth-brand">
          <div className="sidebar__logo">{'\u2696'}</div>
          <div>
            <div className="auth-brand-title">Lex<span>AI</span></div>
            <div className="sidebar__sub">Installation Wizard</div>
          </div>
        </div>

        {!method ? (
          <>
            <h1 className="auth-title">Install Database</h1>
            <p className="auth-sub">Choose your installation method</p>
            <BackendStatusPanel />
            <div className="wizard-methods">
              {METHODS.map((m) => (
                <MethodCard key={m.id} method={m} selected={method === m.id} onSelect={handleMethodSelect} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="wizard-method-bar">
              <button className="wizard-method-bar__back" onClick={() => { setMethod(null); setStep(1); setError(''); setSql(''); }}>
                <Icon name="chevronLeft" size={16} />
              </button>
              <span className="wizard-method-bar__label">{METHODS.find((m) => m.id === method)?.label}</span>
              <span className="wizard-method-bar__step">Step {Math.min(step, currentSteps.length)}/{currentSteps.length}</span>
            </div>

            <StepIndicator steps={currentSteps} current={step} progress={progress} />

            {error && (
              <div className="alert alert--warn dm-mt">
                <Icon name="alert" size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* --- SIMPLE SETUP FORM --- */}
            {method === 'simple' && step === 1 && (
              <div className="dm-mt">
                <p className="auth-sub--sm">Enter your Supabase project credentials</p>
                <Field label="Project URL">
                  <Input type="text" placeholder="https://xxxxx.supabase.co" value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} />
                </Field>
                <Field label="Anon Key" hint="Found in Project Settings → API">
                  <Input type="text" placeholder="eyJhbGciOiJIUzI1NiIs..." value={anonKey} onChange={(e) => setAnonKey(e.target.value)} />
                </Field>
                <div className="dm-toolbar-mt">
                  <Button variant="primary" className="btn--block" icon="bolt" loading={busy} onClick={handleSimpleConnect}>
                    Connect & Install
                  </Button>
                </div>
              </div>
            )}

            {/* --- ADVANCED SETUP FORM --- */}
            {method === 'advanced' && step === 1 && (
              <div className="dm-mt">
                <BackendStatusPanel />
                {!backendConfig.configured && (
                  <div className="alert alert--info dm-mt" style={{ marginBottom: 16 }}>
                    <Icon name="info" size={16} />
                    <span>Advanced Setup requires a backend API server. Set <b>VITE_BACKEND_URL</b> in your environment to connect, or use <b>Simple Setup</b> or <b>Copy-Paste Setup</b> instead.</span>
                  </div>
                )}
                <p className="auth-sub--sm">Enter direct database connection details</p>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <Field label="Host">
                    <Input type="text" placeholder="db.example.com" value={advHost} onChange={(e) => setAdvHost(e.target.value)} />
                  </Field>
                  <Field label="Port">
                    <Input type="text" placeholder="5432" value={advPort} onChange={(e) => setAdvPort(e.target.value)} />
                  </Field>
                </div>
                <Field label="Database">
                  <Input type="text" placeholder="postgres" value={advDb} onChange={(e) => setAdvDb(e.target.value)} />
                </Field>
                <Field label="Username">
                  <Input type="text" placeholder="postgres" value={advUser} onChange={(e) => setAdvUser(e.target.value)} />
                </Field>
                <Field label="Password">
                  <Input type="password" placeholder="Enter password" value={advPassword} onChange={(e) => setAdvPassword(e.target.value)} />
                </Field>
                <div className="dm-toolbar-mt">
                  <Button variant="primary" className="btn--block" icon="gear" loading={busy} onClick={handleAdvancedConnect}>
                    Connect & Install
                  </Button>
                </div>
              </div>
            )}

            {/* --- COPY-PASTE FORM --- */}
            {method === 'copy' && step === 1 && (
              <div className="dm-mt">
                <p className="auth-sub--sm">Generate complete installation SQL for manual execution</p>
                <div className="wizard-info">
                  <Icon name="info" size={15} /> This generates CREATE TABLE, CREATE INDEX, and seed SQL for your provider.
                  Run it in your database's SQL editor, then return to verify.
                </div>
                <div className="dm-toolbar-mt">
                  <Button variant="primary" className="btn--block" icon="copy" loading={busy} onClick={handleGenerateSql}>
                    Generate Installation SQL
                  </Button>
                </div>
              </div>
            )}

            {/* --- COPY-PASTE SQL DISPLAY --- */}
            {method === 'copy' && step >= 2 && copySql && (
              <div className="dm-mt">
                <p className="auth-sub--sm">
                  {step === 5 ? 'After running the SQL, click Verify' : 'Copy this SQL and run it in your database SQL editor'}
                </p>
                <pre className="code-block wizard-sql">{copySql}</pre>
                <div className="toolbar-row dm-mt">
                  <Button variant="ghost" icon="copy" size="sm" onClick={handleCopySql}>
                    {sqlCopied ? 'Copied!' : 'Copy SQL'}
                  </Button>
                  <Button variant="ghost" icon="download" size="sm" onClick={handleDownloadSql}>
                    Download schema.sql
                  </Button>
                  {backendConfig.sqlEditorUrl(detect?.provider) && (
                    <Button variant="ghost" icon="link" size="sm"
                      onClick={() => window.open(backendConfig.sqlEditorUrl(detect?.provider), '_blank', 'noopener')}>
                      Open SQL Editor
                    </Button>
                  )}
                </div>

                {execSqlSupported && step < 5 && (
                  <div className="dm-toolbar-mt">
                    {execSqlError && (
                      <div className="alert alert--warn" style={{ marginBottom: 10 }}>
                        <Icon name="alert" size={16} />
                        <span>{execSqlError}. You can still run the SQL manually.</span>
                      </div>
                    )}
                    {execSqlDone ? (
                      <div className="alert alert--success" style={{ marginBottom: 10 }}>
                        <Icon name="check" size={16} />
                        <span>SQL executed successfully via exec_sql RPC.</span>
                      </div>
                    ) : (
                      <Button variant="primary" className="btn--block" icon="bolt" loading={execSqlBusy} onClick={handleExecuteSql}>
                        Execute SQL Directly
                      </Button>
                    )}
                  </div>
                )}

                {step >= 4 && !execSqlBusy && (
                  <div className="dm-toolbar-mt">
                    <Button variant="primary" className="btn--block" icon="refresh" loading={busy} onClick={handleVerifySql}>
                      I've run it — Verify
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* --- UPLOAD FORM --- */}
            {method === 'upload' && step === 1 && (
              <div className="dm-mt">
                <p className="auth-sub--sm">Upload a database file (.udb, .sql, .json)</p>
                <div
                  className="wizard-dropzone"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setUploadFile(f); setUploadAnalysis(null); } }}
                >
                  <Icon name="upload" size={28} />
                  <div className="wizard-dropzone__text">
                    {uploadFile ? uploadFile.name : 'Click or drop a file here'}
                  </div>
                  {uploadFile && (
                    <div className="wizard-dropzone__size">
                      {(uploadFile.size / 1024).toFixed(1)} KB
                    </div>
                  )}
                  <input ref={fileRef} type="file" style={{ display: 'none' }}
                    accept=".udb,.sql,.json,.dump,.txt" onChange={handleFileSelect} />
                </div>
                <div className="dm-toolbar-mt">
                  <Button variant="primary" className="btn--block" icon="scan" loading={busy} onClick={handleAnalyzeUpload}
                    disabled={!uploadFile}>
                    Analyze File
                  </Button>
                </div>
              </div>
            )}

            {/* --- UPLOAD ANALYSIS --- */}
            {method === 'upload' && uploadAnalysis && step >= 2 && (
              <div className="dm-mt">
                <div className="wizard-analysis">
                  <div className="wizard-analysis__item">
                    <span>Format</span><b>{uploadAnalysis.format}</b>
                  </div>
                  {uploadAnalysis.totalRows !== undefined && (
                    <div className="wizard-analysis__item">
                      <span>Records</span><b>{uploadAnalysis.totalRows.toLocaleString()}</b>
                    </div>
                  )}
                  {uploadAnalysis.collectionsFound !== undefined && (
                    <div className="wizard-analysis__item">
                      <span>Collections</span><b>{uploadAnalysis.collectionsMatched}/{uploadAnalysis.collectionsFound}</b>
                    </div>
                  )}
                  {uploadAnalysis.schemaVersion && (
                    <div className="wizard-analysis__item">
                      <span>Schema Version</span><b>{uploadAnalysis.schemaVersion}</b>
                    </div>
                  )}
                  {uploadAnalysis.sourceProvider && (
                    <div className="wizard-analysis__item">
                      <span>Source</span><b>{uploadAnalysis.sourceProvider}</b>
                    </div>
                  )}
                  {uploadAnalysis.tablesFound !== undefined && (
                    <div className="wizard-analysis__item">
                      <span>Tables</span><b>{uploadAnalysis.tablesMatched}/{uploadAnalysis.tablesFound}</b>
                    </div>
                  )}
                  {uploadAnalysis.missingTables?.length > 0 && (
                    <div className="wizard-analysis__item wizard-analysis__item--warn">
                      <span>Missing tables</span><b>{uploadAnalysis.missingTables.length}</b>
                    </div>
                  )}
                </div>
                {uploadAnalysis.udb && (
                  <div className="dm-toolbar-mt">
                    <Button variant="primary" className="btn--block" icon="upload" loading={busy} onClick={handleImportUpload}>
                      Import Data
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* --- PROGRESS --- */}
            {(progress || busy) && (
              <div className="wizard-progress dm-mt">
                <div className="wizard-progress__bar">
                  <div className="wizard-progress__fill" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="wizard-progress__label">
                  {progress?.status === 'done' ? <Icon name="check" size={14} /> : busy ? <Spinner /> : null}
                  <span>{progress?.label || (busy ? 'Working...' : '')}</span>
                  {progress && <span className="wizard-progress__pct"> ({progressPct}%)</span>}
                </div>
              </div>
            )}

            {/* --- VALIDATION RESULT --- */}
            {validateResult && step >= 6 && (
              <div className={`alert ${validateResult.valid ? 'alert--success' : 'alert--warn'} dm-mt`}>
                <Icon name={validateResult.valid ? 'check' : 'alert'} size={16} />
                <span>
                  {validateResult.valid
                    ? `Installation verified (v${validateResult.version}). Ready to proceed.`
                    : `${validateResult.issueCount} issue${validateResult.issueCount !== 1 ? 's' : ''} found.`}
                </span>
              </div>
            )}

            {/* --- READY / FINISH --- */}
            {step === currentSteps.length && validateResult?.valid && (
              <div className="dm-toolbar-mt">
                <Button variant="primary" className="btn--block" icon="arrow" onClick={handleFinish}>
                  Continue to Setup
                </Button>
              </div>
            )}

            {/* --- FAILED / RETRY --- */}
            {installResult && !installResult.success && (
              <div className="dm-toolbar-mt">
                <Button variant="primary" className="btn--block" icon="refresh" onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            )}

            {/* --- SIMPLE SETUP SQL DISPLAY --- */}
            {method === 'simple' && sql && step === 5 && (
              <div className="dm-mt">
                <p className="auth-sub--sm">Run this SQL in your provider's SQL editor</p>
                <pre className="code-block wizard-sql">{sql}</pre>
                <div className="toolbar-row dm-mt">
                  <Button variant="ghost" icon="copy" size="sm" onClick={handleCopySql}>
                    {sqlCopied ? 'Copied!' : 'Copy SQL'}
                  </Button>
                  <Button variant="ghost" icon="download" size="sm" onClick={handleDownloadSql}>
                    Download
                  </Button>
                  <Button variant="ghost" icon="link" size="sm"
                    onClick={() => window.open('https://console.supabase.com/project/_/sql/new', '_blank', 'noopener')}>
                    SQL Editor
                  </Button>
                </div>

                {execSqlSupported && (
                  <div className="dm-toolbar-mt">
                    {execSqlError && (
                      <div className="alert alert--warn" style={{ marginBottom: 10 }}>
                        <Icon name="alert" size={16} />
                        <span>{execSqlError}. You can still run the SQL manually.</span>
                      </div>
                    )}
                    {execSqlDone ? (
                      <div className="alert alert--success" style={{ marginBottom: 10 }}>
                        <Icon name="check" size={16} />
                        <span>SQL executed successfully via exec_sql RPC.</span>
                      </div>
                    ) : (
                      <Button variant="primary" className="btn--block" icon="bolt" loading={execSqlBusy} onClick={handleExecuteSql}>
                        Execute SQL Directly
                      </Button>
                    )}
                  </div>
                )}

                {!execSqlBusy && (
                  <Button variant="primary" className="btn--block dm-mt" icon="refresh" loading={busy} onClick={handleVerifySql}>
                    I've run it — Verify
                  </Button>
                )}
              </div>
            )}

            {/* --- PROP DETECT ERROR --- */}
            {propDetectError && !error && (
              <div className="alert alert--warn dm-mt">
                <Icon name="alert" size={16} />
                <span>{propDetectError}</span>
              </div>
            )}

            {/* --- CURRENT DETECT STATUS --- */}
            {detect && !method && (
              <div className="db-setup__meta dm-mt">
                <div className="kv"><span>Provider</span><b className="dm-capitalize">{detect.provider}</b></div>
                <div className="kv"><span>Status</span><span>{detect.installed ? `Installed (v${detect.version})` : 'Not installed'}</span></div>
              </div>
            )}
          </>
        )}

        {!method && (
          <div className="auth-note">
            All methods are provider-independent. Your data remains compatible across providers.
          </div>
        )}
      </div>
    </div>
  );
}

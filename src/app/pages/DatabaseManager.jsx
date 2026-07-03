import { useState, useEffect, useCallback, useRef } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { databaseManagerLogic } from '@/logic/databaseManagerLogic.js';
import { migrateLocalStorage } from '@/utils/migrateLocalStorage.js';
import { bytes, formatDateTime } from '@/utils/format.js';

// DatabaseManager — universal, provider-agnostic database administration.
// All data access flows through databaseManagerLogic (logic → services →
// repositories → providers). This page contains ZERO provider-specific code
// and ZERO inline styles — all CSS lives in index.css.

const SEV_TONE = { critical: 'red', warn: 'amber', info: 'grey' };

export default function DatabaseManager() {
  const { user } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [data, setData] = useState(null);
  const [sql, setSql] = useState('');
  const [busy, setBusy] = useState('');
  const [diffReport, setDiffReport] = useState(null);
  const [showSql, setShowSql] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await databaseManagerLogic.overview();
    if (res.ok) {
      setData(res.data);
      setSql(databaseManagerLogic.installSql() || '');
    } else {
      toast.push(`Could not load database status: ${res.error}`, 'error');
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const run = async (key, fn, successMsg, { confirm: msg } = {}) => {
    if (msg && !window.confirm(msg)) return;
    setBusy(key);
    const res = await fn();
    setBusy('');
    if (res?.ok) {
      toast.push(typeof successMsg === 'function' ? successMsg(res.data) : successMsg, 'success');
      load();
    } else {
      toast.push(res?.error || 'Action failed.', 'error');
    }
  };

  const onRunDiff = async () => {
    setBusy('diff');
    const res = await databaseManagerLogic.diffSchema();
    setBusy('');
    if (res.ok) setDiffReport(res.data);
    else toast.push(res.error || 'Schema diff failed.', 'error');
  };

  const onCopySql = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    } catch {
      toast.push('Could not copy — select and copy manually.', 'warn');
    }
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('import');
    const text = await file.text();
    const parsed = await databaseManagerLogic.parseImport(text);
    if (!parsed.ok) { setBusy(''); toast.push(parsed.reason, 'error'); return; }
    if (!parsed.checksumOk || !parsed.versionOk) {
      if (!window.confirm(`${parsed.reason}. Import anyway?`)) { setBusy(''); return; }
    }
    if (!window.confirm('Importing replaces all current data with the .udb contents. Continue?')) {
      setBusy(''); return;
    }
    const res = await databaseManagerLogic.importDatabase(parsed.udb, user);
    setBusy('');
    if (res.ok) { toast.push('Database imported from .udb.', 'success'); load(); }
    else toast.push(res.error || 'Import failed.', 'error');
  };

  if (!data) {
    return (
      <PageHeader icon="database" title="Database Manager" subtitle="Manage database schema, validation, and migration." />
    );
  }

  const { connection, validation, health, statistics } = data;
  const schemaTone = validation.valid ? 'green' : (connection.connected ? 'amber' : 'red');
  const schemaLabel = validation.valid ? 'Healthy' : (validation.missing?.length ? `${validation.missing.length} missing` : 'Unknown');
  const healthTone = !health ? 'grey' : health.healthy ? 'green' : (health.summary.critical ? 'red' : 'amber');
  const healthLabel = !health ? '—' : `${health.score}/100`;
  const schedule = databaseManagerLogic.backupSchedule();
  const needsManualInstall = !validation.valid && sql;

  return (
    <div className="fade-in">
      <PageHeader
        icon="database"
        title="Database Manager"
        subtitle="Provider, schema, health, migration, statistics and universal .udb import/export."
      />

      {/* One-click install banner when schema is missing */}
      {needsManualInstall && (
        <div className="dm-install-banner">
          <Icon name="alert" size={18} />
          <div className="dm-install-banner__body">
            <b>Schema not installed.</b> Run the SQL below in your database provider's SQL editor, or add an
            <code>exec_sql</code> RPC for one-click installation.
          </div>
          <div className="dm-install-banner__actions">
            <PermissionGate perm="settings.manageSettings">
              <Button
                size="sm"
                icon="database"
                loading={busy === 'install'}
                onClick={() => run('install', () => databaseManagerLogic.install(user),
                  (v) => v.needsManual ? 'Manual SQL required — see Install SQL below.' : 'Database installed.')}
              >
                One-Click Install
              </Button>
            </PermissionGate>
            <Button size="sm" variant="ghost" icon="code" onClick={() => setShowSql((v) => !v)}>
              {showSql ? 'Hide SQL' : 'Show SQL'}
            </Button>
            <Button size="sm" variant="ghost" icon="copy" onClick={onCopySql}>
              {sqlCopied ? 'Copied!' : 'Copy SQL'}
            </Button>
          </div>
        </div>
      )}

      {/* Expandable SQL block */}
      {needsManualInstall && showSql && (
        <Card title="Install SQL" sub="Paste this once into your database provider's SQL editor." className="dm-section">
          <pre className="code-block">{sql}</pre>
          <div className="toolbar-row">
            <Button variant="ghost" icon="copy" onClick={onCopySql}>{sqlCopied ? 'Copied!' : 'Copy SQL'}</Button>
          </div>
        </Card>
      )}

      {/* Overview + Statistics */}
      <div className="grid-2 dm-section">
        <Card title="Overview" sub="Provider selected via environment variable.">
          <div className="kv"><span>Provider</span><b className="dm-capitalize">{data.provider}</b></div>
          <div className="kv"><span>Connection</span><Badge tone={connection.connected ? 'green' : 'red'} dot>{connection.connected ? 'Connected' : 'Disconnected'}</Badge></div>
          <div className="kv"><span>Database Version</span>
            <span>{data.databaseVersion || 'not installed'}
              {data.databaseVersion && data.databaseVersion !== data.targetVersion ? ` → ${data.targetVersion}` : ''}
            </span>
          </div>
          <div className="kv"><span>Schema Version</span><span>{data.schemaVersion}</span></div>
          <div className="kv"><span>Health</span><Badge tone={healthTone} dot>{healthLabel}</Badge></div>
          <div className="kv"><span>UDB Format</span><span>v{data.udbVersion}</span></div>
          {connection.error && (
            <div className="alert alert--warn dm-mt">
              <Icon name="alert" size={15} /><span>{connection.error}</span>
            </div>
          )}
        </Card>

        <Card title="Statistics">
          <div className="health-grid">
            <StatCell label="Users" value={statistics.users} icon="users" />
            <StatCell label="Roles" value={statistics.roles} icon="badge" />
            <StatCell label="Cases" value={statistics.cases} icon="vault" />
            <StatCell label="Documents" value={statistics.documents} icon="file" />
            <StatCell label="Storage" value={bytes(data.storageUsed)} icon="database" />
            <StatCell label="Total Records" value={data.totalRows} icon="layers" />
          </div>
        </Card>
      </div>

      {/* Health */}
      <Card title="Health" sub="Schema issues and repair suggestions." className="dm-section">
        <div className="kv"><span>Health Score</span><Badge tone={healthTone} dot>{healthLabel}</Badge></div>
        {health && (
          <div className="chips dm-chips-mt">
            <span className="tag">Critical: <b className="dm-chip-count">{health.summary.critical}</b></span>
            <span className="tag">Warnings: <b className="dm-chip-count">{health.summary.warnings}</b></span>
            <span className="tag">Info: <b className="dm-chip-count">{health.summary.info}</b></span>
          </div>
        )}
        {health && health.issues.length > 0 && (
          <div className="dm-issues-list">
            {health.issues.slice(0, 12).map((i, idx) => (
              <div className="kv" key={idx}>
                <span>
                  <Badge tone={SEV_TONE[i.severity] || 'grey'}>{i.severity}</Badge>
                  {i.collection !== '*' ? ` ${i.collection}: ` : ' '}{i.detail}
                </span>
                {i.repairable && <Badge tone="navy">repairable</Badge>}
              </div>
            ))}
          </div>
        )}
        <div className="toolbar-row">
          <Button icon="scan" loading={busy === 'scan'}
            onClick={() => run('scan', () => databaseManagerLogic.scan(),
              (v) => `Scan complete — score ${v.score}/100.`)}>
            Scan Database
          </Button>
          <PermissionGate perm="settings.manageSettings">
            <Button variant="ghost" icon="refresh" loading={busy === 'rephealth'}
              onClick={() => run('rephealth', () => databaseManagerLogic.repairHealth(user),
                (v) => `Repair done — ${v.actions.length} action(s).`)}>
              Repair Database
            </Button>
          </PermissionGate>
          <Button variant="ghost" icon="shield" loading={busy === 'valhealth'}
            onClick={() => run('valhealth', () => databaseManagerLogic.validateHealth(),
              (v) => v.valid ? 'Valid — no critical issues.' : 'Validation found critical issues.')}>
            Validate Schema
          </Button>
        </div>
      </Card>

      {/* Schema Diff Report */}
      <Card title="Schema Diff" sub="Deep structural diff: missing tables, columns, indexes and type mismatches." className="dm-section">
        <div className="toolbar-row">
          <Button icon="layers" loading={busy === 'diff'} onClick={onRunDiff}>Run Schema Diff</Button>
        </div>
        {diffReport && (
          diffReport.healthy ? (
            <div className="alert alert--success dm-mt">
              <Icon name="shield" size={15} /><span>Schema is fully in sync with the backend. No issues found.</span>
            </div>
          ) : (
            <div className="dm-diff-report">
              <DiffSection title="Missing Tables" items={diffReport.missingTables} renderItem={(i) => (
                <span className="dm-diff-item"><b>{i.collection}</b> — {i.reason}</span>
              )} />
              <DiffSection title="Missing Columns" items={diffReport.missingColumns} renderItem={(i) => (
                <span className="dm-diff-item"><b>{i.collection}.{i.column}</b> <span className="dm-type-badge">{i.expectedType}</span> — {i.reason}</span>
              )} />
              <DiffSection title="Missing Indexes" items={diffReport.missingIndexes} renderItem={(i) => (
                <span className="dm-diff-item"><b>{i.collection}.{i.column}</b> — {i.reason}</span>
              )} />
              <DiffSection title="Type Mismatches" items={diffReport.wrongTypes} renderItem={(i) => (
                <span className="dm-diff-item"><b>{i.collection}.{i.column}</b> expected <code>{i.expected}</code> got <code>{i.actual}</code></span>
              )} />
              <div className="dm-repair-plan">
                <b>Repair Plan ({diffReport.repairPlan.length} action{diffReport.repairPlan.length !== 1 ? 's' : ''})</b>
                {diffReport.repairPlan.map((step, i) => (
                  <div key={i} className={`dm-repair-step${step.manual ? ' dm-repair-step--manual' : ''}`}>
                    <Badge tone={step.manual ? 'amber' : 'navy'}>{step.action}</Badge>
                    <span>{step.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </Card>

      {/* Schema + Migration */}
      <div className="grid-2 dm-section">
        <Card title="Schema">
          <div className="kv"><span>Status</span><Badge tone={schemaTone} dot>{schemaLabel}</Badge></div>
          <div className="kv"><span>Tables / Collections</span>
            <span>{validation.present?.length || 0} / {data.known.length}</span>
          </div>
          <div className="kv"><span>Missing</span><span>{validation.missing?.length || 0}</span></div>
          {validation.missing?.length > 0 && (
            <div className="chips dm-chips-mt">
              {validation.missing.map((c) => <span key={c} className="tag">{c}</span>)}
            </div>
          )}
          <div className="toolbar-row dm-toolbar-mt">
            <PermissionGate perm="settings.manageSettings">
              <Button icon="layers" loading={busy === 'create'}
                onClick={() => run('create', () => databaseManagerLogic.createSchema(user), 'Schema ensured.')}>
                Create Schema
              </Button>
            </PermissionGate>
            <PermissionGate perm="settings.manageSettings">
              <Button variant="ghost" icon="refresh" loading={busy === 'repair'}
                onClick={() => run('repair', () => databaseManagerLogic.repairSchema(user), 'Schema repaired.')}>
                Repair Schema
              </Button>
            </PermissionGate>
            <Button variant="ghost" icon="shield" loading={busy === 'validate'}
              onClick={() => run('validate', () => databaseManagerLogic.validateSchema(), 'Schema validated.')}>
              Validate
            </Button>
          </div>
        </Card>

        <Card title="Migration" sub="Install, upgrade or roll back the schema version.">
          <div className="kv"><span>Installed</span><span>{data.databaseVersion || 'not installed'}</span></div>
          <div className="kv"><span>Target</span><span>{data.targetVersion}</span></div>
          {data.meta?.history?.length > 0 && (
            <div className="kv">
              <span>Last action</span>
              <span>{data.meta.history[0].action} → v{data.meta.history[0].version}</span>
            </div>
          )}
          <div className="toolbar-row dm-toolbar-mt">
            <PermissionGate perm="settings.manageSettings">
              <Button icon="database" loading={busy === 'install'}
                onClick={() => run('install', () => databaseManagerLogic.install(user),
                  (v) => v.needsManual ? 'Manual SQL required — see Install SQL above.' : 'Database installed.')}>
                Install Schema
              </Button>
            </PermissionGate>
            <PermissionGate perm="settings.manageSettings">
              <Button variant="ghost" icon="bolt" loading={busy === 'upgrade'}
                onClick={() => run('upgrade', () => databaseManagerLogic.upgrade(user),
                  (v) => `Upgraded to v${v.to}.`)}>
                Upgrade Schema
              </Button>
            </PermissionGate>
            <PermissionGate perm="settings.manageSettings">
              <Button variant="ghost" icon="history" loading={busy === 'rollback'}
                onClick={() => run('rollback', () => databaseManagerLogic.rollback(user),
                  (v) => `Rolled back to v${v.to}.`,
                  { confirm: 'Roll back the schema version by one step?' })}>
                Rollback Schema
              </Button>
            </PermissionGate>
          </div>
        </Card>
      </div>

      {/* Migrate from localStorage */}
      <Card title="Migrate from LocalStorage" sub="One-time migration: push existing localStorage data into the active database provider." className="dm-section">
        <div className="alert alert--warn dm-mt">
          <Icon name="alert" size={15} />
          <span>Only run this once if you have data stored in localStorage from a previous local provider setup. After migration, the localStorage data is cleared.</span>
        </div>
        <div className="toolbar-row dm-toolbar-mt">
          <PermissionGate perm="settings.manageSettings">
            <Button icon="upload" loading={busy === 'migrate'}
              onClick={async () => {
                if (!window.confirm('Migrate localStorage data to the active provider? This cannot be undone.')) return;
                setBusy('migrate');
                const report = await migrateLocalStorage();
                setBusy('');
                if (report.errors?.length) {
                  toast.push(`Migration finished with ${report.errors.length} error(s).`, 'warn');
                } else {
                  toast.push(report.message || 'Migration complete.', 'success');
                }
                load();
              }}>
              Migrate from LocalStorage
            </Button>
          </PermissionGate>
        </div>
      </Card>

      {/* Data */}
      <Card title="Data" sub="Row counts per collection." className="dm-section">
        <div className="health-grid">
          {data.known.map((name) => (
            <div className="health-cell" key={name}>
              <span className="health-cell__icon"><Icon name="database" size={15} /></span>
              <div>
                <div className="health-cell__value">{data.counts[name] ?? 0}</div>
                <div className="health-cell__label">{name}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="toolbar-row dm-toolbar-mt">
          <PermissionGate perm="settings.manageSettings">
            <Button variant="danger" icon="trash" loading={busy === 'clear'}
              onClick={() => run('clear', () => databaseManagerLogic.clearDatabase(user),
                'Database cleared.',
                { confirm: 'Clear Database deletes EVERY record in all collections. This cannot be undone. Continue?' })}>
              Clear Database
            </Button>
          </PermissionGate>
        </div>
      </Card>

      {/* Import / Export + Backup */}
      <div className="grid-2 dm-section">
        <Card title="Backup — Export / Import" sub="Universal .udb package — portable across any provider.">
          <div className="toolbar-row">
            <PermissionGate perm="settings.export">
              <Button icon="download" loading={busy === 'export'}
                onClick={() => run('export', () => databaseManagerLogic.exportDatabase(user),
                  'Database exported as .udb.')}>
                Export .udb
              </Button>
            </PermissionGate>
            <PermissionGate perm="settings.import">
              <Button variant="ghost" icon="upload" loading={busy === 'import'}
                onClick={() => fileRef.current?.click()}>
                Import .udb
              </Button>
            </PermissionGate>
            <input ref={fileRef} type="file" accept=".udb,application/json" hidden onChange={onImportFile} />
          </div>
          <div className="alert alert--info dm-mt">
            <Icon name="bolt" size={15} />
            <span>A <code>.udb</code> carries manifest, schema, permissions, relationships, settings,
              version, data and logs — so a Supabase export imports cleanly into Firebase or MongoDB.</span>
          </div>
        </Card>

        <Card title="Backup Destinations" sub="Send a .udb snapshot to a destination.">
          <div className="kv">
            <span>Schedule</span>
            <span className="dm-capitalize">
              {schedule.frequency}
              {schedule.lastRunAt ? ` · last ${formatDateTime(schedule.lastRunAt)}` : ''}
            </span>
          </div>
          <div className="toolbar-row dm-toolbar-mt">
            {databaseManagerLogic.destinations().map((d) => (
              <PermissionGate perm="settings.export" key={d.key}>
                <Button
                  variant={d.key === 'local' ? 'primary' : 'ghost'}
                  icon={d.key === 'local' ? 'download' : 'database'}
                  loading={busy === `bk_${d.key}`}
                  onClick={() => run(`bk_${d.key}`, () => databaseManagerLogic.backup(d.key, user),
                    (v) => v?.delivery?.ok ? `Backup sent to ${d.label}.` : `Backup recorded. ${v?.delivery?.reason || ''}`)}
                >
                  {d.label}{!d.available && ' *'}
                </Button>
              </PermissionGate>
            ))}
          </div>
          <div className="alert alert--warn dm-mt">
            <Icon name="alert" size={15} />
            <span><b>*</b> Cloud destinations need a backend to hold credentials. Local Download works
              without one.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---- sub-components (no inline styles) ------------------------------------

function StatCell({ label, value, icon }) {
  return (
    <div className="health-cell">
      <span className="health-cell__icon"><Icon name={icon} size={16} /></span>
      <div>
        <div className="health-cell__value">{value}</div>
        <div className="health-cell__label">{label}</div>
      </div>
    </div>
  );
}

function DiffSection({ title, items, renderItem }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="dm-diff-section">
      <div className="dm-diff-section__title">
        <Badge tone="red">{items.length}</Badge> {title}
      </div>
      {items.map((item, i) => (
        <div key={i} className="dm-diff-row">{renderItem(item)}</div>
      ))}
    </div>
  );
}


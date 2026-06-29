import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import Spinner from '@/components/Spinner.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import { schemaService } from '@/services/schemaService.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

function statusIcon(action) {
  if (action === 'createTable') return { icon: 'plus', tone: 'amber' };
  if (action === 'addColumn') return { icon: 'plus', tone: 'navy' };
  if (action === 'createIndex') return { icon: 'plus', tone: 'green' };
  if (action === 'reviewType') return { icon: 'alert', tone: 'red' };
  return { icon: 'gear', tone: 'grey' };
}

export default function SchemaManager() {
  const toast = useToast();
  const nav = useNavigate();
  const [diff, setDiff] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [sql, setSql] = useState('');
  const [tab, setTab] = useState('diff');
  const schemas = schemaService.listSchemas();
  const schemaVersion = schemaService.schemaVersion();

  const scan = useCallback(async () => {
    setScanning(true);
    try {
      const [diffRes, healthRes] = await Promise.all([
        schemaService.diffSchema(),
        schemaService.scanHealth(),
      ]);
      setDiff(diffRes);
      setHealth(healthRes);
    } catch (e) {
      toast.push(`Scan failed: ${e.message}`, 'error');
    }
    setScanning(false);
    setLoading(false);
  }, [toast]);

  useEffect(() => { scan(); }, [scan]);

  const runRepair = async () => {
    setRepairing(true);
    try {
      const result = await schemaService.repairHealth();
      toast.push(`Repair completed: ${result.actions.length} action(s).`, 'success');
      await scan();
    } catch (e) {
      toast.push(`Repair failed: ${e.message}`, 'error');
    }
    setRepairing(false);
  };

  const generateSql = () => {
    if (!diff) return;
    const sqlText = schemaService.toSQL(diff);
    setSql(sqlText);
    setShowSql(true);
  };

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      toast.push('SQL copied to clipboard.', 'success');
    } catch {
      toast.push('Could not copy to clipboard.', 'warn');
    }
  };

  const exportSchema = () => {
    const payload = {
      version: schemaVersion,
      exportedAt: new Date().toISOString(),
      schemas: schemas.map((s) => ({
        collection: s.collection,
        label: s.label,
        fields: s.fields,
        required: s.required,
        defaults: s.defaults,
        indexes: s.indexes,
        relations: s.relations,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `lexai-schema-v${schemaVersion}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.push('Schema exported.', 'success');
  };

  const importSchema = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.version || !data.schemas) { toast.push('Invalid schema file.', 'error'); return; }
        toast.push(`Schema v${data.version} loaded (${data.schemas.length} collections).`, 'success');
        setSql(JSON.stringify(data, null, 2));
        setShowSql(true);
      } catch (err) {
        toast.push(`Import failed: ${err.message}`, 'error');
      }
    };
    input.click();
  };

  if (loading) return <div className="page page--center"><Spinner label="Scanning schemas…" /></div>;

  const totalTables = schemas.length;
  const missingTables = diff?.missingTables?.length || 0;
  const missingCols = diff?.missingColumns?.length || 0;
  const healthScore = health?.score ?? 0;

  return (
    <div className="page schema-mgr fade-in">
      <PageHeader
        icon="database"
        title="Schema Manager"
        subtitle={`Software v${schemaVersion} · Provider: ${health?.provider || '—'} · Health score: ${healthScore}/100`}
        actions={
          <div className="row-actions">
            <Button size="sm" variant="ghost" icon="search" loading={scanning} onClick={scan}>Rescan</Button>
            <Button size="sm" variant="ghost" icon="download" onClick={exportSchema}>Export</Button>
            <Button size="sm" variant="ghost" icon="upload" onClick={importSchema}>Import</Button>
          </div>
        }
      />

      {/* Health summary */}
      <div className="grid-4 mb-20">
        <Card>
          <div className="health-cell"><span className="health-cell__value">{totalTables}</span><span className="health-cell__label">Software Tables</span></div>
        </Card>
        <Card>
          <div className="health-cell">
            <span className={`health-cell__value${missingTables ? ' health-cell__value--warn' : ' health-cell__value--ok'}`}>{missingTables}</span>
            <span className="health-cell__label">Missing Tables</span>
          </div>
        </Card>
        <Card>
          <div className="health-cell">
            <span className={`health-cell__value${missingCols ? ' health-cell__value--amber' : ' health-cell__value--ok'}`}>{missingCols}</span>
            <span className="health-cell__label">Missing Columns</span>
          </div>
        </Card>
        <Card>
          <div className="health-cell">
            <span className={`health-cell__value${healthScore < 80 ? ' health-cell__value--warn' : ' health-cell__value--ok'}`}>{healthScore}</span>
            <span className="health-cell__label">Health Score</span>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="tabs mb-16">
        <div className={`tab ${tab === 'diff' ? 'active' : ''}`} onClick={() => setTab('diff')}>Schema Diff</div>
        <div className={`tab ${tab === 'tables' ? 'active' : ''}`} onClick={() => setTab('tables')}>Tables</div>
        <div className={`tab ${tab === 'issues' ? 'active' : ''}`} onClick={() => setTab('issues')}>Health Issues {health?.summary?.total ? `(${health.summary.total})` : ''}</div>
      </div>

      {/* Tab: Schema Diff */}
      {tab === 'diff' && (
        <>
          {diff?.missingTables?.length > 0 && (
            <Card title={`Missing Tables (${diff.missingTables.length})`} tone="amber" className="mb-16">
              <table className="table">
                <thead><tr><th>Table</th><th>Reason</th><th>Action</th></tr></thead>
                <tbody>
                  {diff.missingTables.map((t) => (
                    <tr key={t.collection}>
                      <td className="fw-600">{t.collection}</td>
                      <td className="health-cell__detail">{t.reason}</td>
                      <td><Badge tone="amber">Missing</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {diff?.missingColumns?.length > 0 && (
            <Card title={`Missing Columns (${diff.missingColumns.length})`} tone="navy" className="mb-16">
              <table className="table">
                <thead><tr><th>Table</th><th>Column</th><th>Expected Type</th><th>Action</th></tr></thead>
                <tbody>
                  {diff.missingColumns.map((c) => (
                    <tr key={`${c.collection}.${c.column}`}>
                      <td className="fw-600">{c.collection}</td>
                      <td><code>{c.column}</code></td>
                      <td><Badge tone="grey">{c.expectedType}</Badge></td>
                      <td><Badge tone="navy">Add Column</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {diff?.wrongTypes?.length > 0 && (
            <Card title={`Type Mismatches (${diff.wrongTypes.length})`} tone="red" className="mb-16">
              <table className="table">
                <thead><tr><th>Table</th><th>Column</th><th>Expected</th><th>Actual</th><th>Action</th></tr></thead>
                <tbody>
                  {diff.wrongTypes.map((t) => (
                    <tr key={`${t.collection}.${t.column}`}>
                      <td className="fw-600">{t.collection}</td>
                      <td><code>{t.column}</code></td>
                      <td><Badge tone="green">{t.expected}</Badge></td>
                      <td><Badge tone="red">{t.actual}</Badge></td>
                      <td><Badge tone="red">Manual Review</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {diff?.missingIndexes?.length > 0 && (
            <Card title={`Missing Indexes (${diff.missingIndexes.length})`} tone="green" className="mb-16">
              <table className="table">
                <thead><tr><th>Table</th><th>Column</th><th>Action</th></tr></thead>
                <tbody>
                  {diff.missingIndexes.map((ix) => (
                    <tr key={`${ix.collection}.${ix.column}`}>
                      <td className="fw-600">{ix.collection}</td>
                      <td><code>{ix.column}</code></td>
                      <td><Badge tone="green">Create Index</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {diff?.healthy && (
            <Card title="Schema Status">
              <EmptyState icon="check" title="All schemas are in sync." hint={`${totalTables} tables match the software schema.`} />
            </Card>
          )}

          {diff?.repairPlan?.length > 0 && (
            <div className="form__actions mt-16">
              <Button icon="check" variant="primary" loading={repairing} onClick={runRepair}>
                Sync Missing Tables ({diff.repairPlan.filter((a) => a.action === 'createTable').length})
              </Button>
              {diff.repairPlan.filter((a) => a.action === 'addColumn' || a.action === 'createIndex').length > 0 && (
                <Button icon="download" variant="ghost" onClick={generateSql}>Generate Migration SQL</Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Tab: Tables */}
      {tab === 'tables' && (
        <Card title={`All Tables (${schemas.length})`}>
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Collection</th><th>Label</th><th>Fields</th><th>Required</th><th>Core</th><th>Status</th></tr></thead>
              <tbody>
                {schemas.map((s) => {
                  const missing = diff?.missingTables?.find((t) => t.collection === s.collection);
                  const fieldCount = Object.keys(s.fields || {}).length;
                  return (
                    <tr key={s.collection}>
                      <td className="fw-600">{s.collection}</td>
                      <td>{s.label || '—'}</td>
                      <td>{fieldCount}</td>
                      <td>{(s.required || []).length}</td>
                      <td><Badge tone={s.core ? 'navy' : 'grey'}>{s.core ? 'Yes' : 'No'}</Badge></td>
                      <td>
                        {missing ? <Badge tone="amber">Missing</Badge> : <Badge tone="green">✓ Existing</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab: Health Issues */}
      {tab === 'issues' && (
        <Card title={`Health Issues (${health?.issues?.length || 0})`}>
          {!health?.issues?.length ? (
            <EmptyState icon="check" title="No health issues." hint="All systems operational." />
          ) : (
            <table className="table">
              <thead><tr><th>Severity</th><th>Type</th><th>Collection</th><th>Detail</th></tr></thead>
              <tbody>
                {health.issues.map((iss, i) => (
                    <tr key={i}>
                      <td><Badge tone={iss.severity === 'critical' ? 'red' : iss.severity === 'warn' ? 'amber' : 'grey'}>
                        {iss.severity}
                      </Badge></td>
                      <td><code>{iss.type}</code></td>
                      <td className="fw-600">{iss.collection}</td>
                    <td className="health-cell__detail">{iss.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* SQL Modal */}
      {showSql && (
        <div className="modal-overlay" onClick={() => setShowSql(false)}>
          <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <h3>Migration SQL</h3>
              <button className="iconbtn" onClick={() => setShowSql(false)}><Icon name="close" size={16} /></button>
            </div>
            <div className="modal__body">
              <pre className="schema-mgr__sql">{sql || 'No SQL generated.'}</pre>
            </div>
            <div className="modal__foot">
              <Button variant="ghost" onClick={() => setShowSql(false)}>Close</Button>
              {sql && <Button icon="copy" onClick={copySql}>Copy SQL</Button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


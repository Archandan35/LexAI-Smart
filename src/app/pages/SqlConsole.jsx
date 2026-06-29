import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import { Field, Textarea } from '@/components/Field.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { databaseDdlService } from '@/services/databaseDdlService.js';
import { AllowlistEngine } from '@/core/AllowlistEngine.js';
import { settingsLogic } from '@/logic/settingsLogic.js';
import { DateEngine } from '@/core/DateEngine.js';

export default function SqlConsole() {
  const toast = useToast();
  const [sql, setSql] = useState('');
  const [validation, setValidation] = useState(null);
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await settingsLogic.loadHistory();
      if (res.ok) setHistory(res.data);
    })();
  }, []);

  const onValidate = () => {
    if (!sql.trim()) { setValidation(null); return; }
    const v = AllowlistEngine.validate(sql);
    setValidation(v);
  };

  const onExecute = async () => {
    if (!sql.trim()) return;
    const v = AllowlistEngine.validate(sql);
    setValidation(v);
    if (!v.valid) { toast.push('SQL validation failed — fix errors before executing.', 'error'); return; }
    setBusy('exec');
    setResults(null);
    const res = await databaseDdlService.executeSql(sql);
    setBusy('');
    if (res.ok) {
      setResults(res.data);
      const updated = await settingsLogic.saveHistory({ sql: sql.substring(0, 500), ok: true, count: res.data.statementCount });
      if (updated.ok) setHistory(updated.data);
      toast.push(`${res.data.statementCount} statement(s) executed.`, 'success');
    } else {
      setResults({ error: res.error });
      const updated = await settingsLogic.saveHistory({ sql: sql.substring(0, 500), ok: false, error: res.error });
      if (updated.ok) setHistory(updated.data);
      toast.push(res.error, 'error');
    }
  };

  const onClear = () => {
    setSql('');
    setValidation(null);
    setResults(null);
  };

  const selectHistory = (entry) => {
    setSql(entry.sql);
    setValidation(null);
    setResults(null);
    setShowHistory(false);
  };

  const onCopySql = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sql);
      toast.push('SQL copied.', 'success');
    } catch {
      toast.push('Could not copy to clipboard.', 'warn');
    }
  }, [sql, toast]);

  const validCount = validation ? validation.statementCount - validation.errors.length : 0;

  return (
    <div className="fade-in">
      <PageHeader
        icon="code"
        title="SQL Console"
        subtitle="Execute safe DDL statements against the database. All SQL is validated by AllowlistEngine."
      />

      <Card
        title="SQL Editor"
        sub="Enter one or more safe DDL statements separated by semicolons."
        actions={
          <div className="row-actions">
            <Button size="sm" variant="ghost" icon="history" onClick={() => setShowHistory((v) => !v)}>
              History ({history.length})
            </Button>
            <Button size="sm" variant="ghost" icon="copy" onClick={onCopySql}>Copy</Button>
          </div>
        }
      >
        <Field>
          <Textarea
            value={sql}
            onChange={(e) => { setSql(e.target.value); setValidation(null); }}
            placeholder={`-- Enter safe DDL statements here\nCREATE TABLE IF NOT EXISTS "my_table" (\n  "id" uuid PRIMARY KEY,\n  "name" text\n);\n\n-- Or validate first, then execute`}
            rows={12}
            className="sql-console__textarea"
          />
        </Field>

        <div className="toolbar-row">
          <Button icon="search" variant="ghost" onClick={onValidate}>Validate</Button>
          <PermissionGate perm="settings.manageSettings">
            <Button icon="bolt" loading={busy === 'exec'} onClick={onExecute}>Execute</Button>
          </PermissionGate>
          <Button variant="ghost" icon="trash" onClick={onClear}>Clear</Button>
        </div>
      </Card>

      {validation && !validation.valid && (
        <Card title="Validation Errors" tone="amber" className="sc-card">
          <div className="mb-10">
            <Badge tone="red">{validation.errors.length} error(s)</Badge>
            {' '}<Badge tone="green">{validCount} valid</Badge>
            {' '}<Badge tone="grey">{validation.statementCount} statement(s)</Badge>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>#</th><th>SQL</th><th>Reason</th></tr></thead>
              <tbody>
                {validation.errors.map((e, i) => (
                  <tr key={i}>
                    <td>{e.statement}</td>
                    <td><code className="sql-console__code">{e.sql}</code></td>
                    <td><Badge tone="red">{e.reason}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {validation && validation.valid && (
        <Card title="Validation Passed" tone="success" className="sc-card">
          <Badge tone="green">{validation.statementCount} safe statement(s)</Badge>
        </Card>
      )}

      {results && (
        <Card title="Execution Results" tone={results.error ? 'danger' : 'success'} className="sc-card">
          {results.error ? (
            <div className="alert alert--danger"><Icon name="alert" size={15} /><span>{results.error}</span></div>
          ) : (
            <div>
              <div className="mb-10">
                <Badge tone="green">{results.allOk ? 'All passed' : 'Some failed'}</Badge>
                {' '}<Badge tone="grey">{results.results.length}/{results.statementCount} executed</Badge>
              </div>
              <div className="table-scroll">
                <table className="table">
                  <thead><tr><th>#</th><th>SQL</th><th>Status</th><th>Error</th></tr></thead>
                  <tbody>
                    {results.results.map((r, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><code className="sql-console__code">{r.sql}</code></td>
                        <td>{r.ok ? <Badge tone="green">OK</Badge> : <Badge tone="red">Failed</Badge>}</td>
                        <td className="sql-console__error-cell">{r.error || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {showHistory && (
        <Card title="SQL History" sub="Last 50 executed statements (stored in database)" className="sc-card">
          {history.length === 0 ? (
            <EmptyState icon="history" title="No history yet" hint="Executed SQL statements will appear here." />
          ) : (
            <div className="table-scroll sql-console__history-scroll">
              <table className="table">
                <thead><tr><th>Status</th><th>SQL</th><th>Time</th><th></th></tr></thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} className="row--clickable" onClick={() => selectHistory(h)}>
                      <td>{h.ok ? <Badge tone="green">OK</Badge> : <Badge tone="red">Failed</Badge>}</td>
                      <td><code className="sql-console__code">{h.sql}</code></td>
                      <td className="sql-console__ts-cell">
                        {h.ts ? DateEngine.formatTime(h.ts) : '—'}
                      </td>
                      <td className="text-right">
                        <Button size="sm" variant="ghost" icon="edit" onClick={(e) => { e.stopPropagation(); selectHistory(h); }}>Load</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}


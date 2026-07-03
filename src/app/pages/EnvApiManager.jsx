import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import Modal from '@/components/Modal.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';
import { Field, Input, Select } from '@/components/Field.jsx';
import { envLogic } from '@/logic/envLogic.js';
import { ENV_CATEGORY_KEYS } from '@/constants/envCatalog.js';
import { usePermissions } from '@/hooks/usePermissions.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { formatDateTime } from '@/utils/format.js';

const TABS = ['Environment Variables', 'API Manager', 'Secret Manager', 'Sync Status', 'Configuration History'];

export default function EnvApiManager() {
  const { can } = usePermissions();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('Environment Variables');
  const [rows, setRows] = useState([]);
  const [apis, setApis] = useState([]);
  const [history, setHistory] = useState([]);
  const [revealed, setRevealed] = useState({});
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState(null); // {name?, value, ...}

  const load = useCallback(async () => {
    const [r, a, h] = await Promise.all([envLogic.list(), envLogic.apis(), envLogic.history()]);
    setRows(r); setApis(a); setHistory(h);
  }, []);
  useEffect(() => { load(); }, [load]);

  const canSecrets = can('env.secrets');

  const filtered = rows.filter((r) => {
    if (category && r.category !== category) return false;
    if (query && !r.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const save = async () => {
    if (!editing.name?.trim()) { toast.push('Variable name is required.', 'error'); return; }
    await envLogic.upsert({ name: editing.name.trim().toUpperCase(), value: editing.value, status: editing.status }, user);
    toast.push('Variable saved.', 'success'); setEditing(null); load();
  };
  const del = async (r) => { if (confirm(`Delete ${r.name}? (resets to environment value)`)) { await envLogic.remove(r.name, user); toast.push('Variable removed.', 'info'); load(); } };
  const toggle = async (r) => { await envLogic.setStatus(r.name, r.status === 'enabled' ? 'disabled' : 'enabled', user); load(); };
  const rotate = async (r) => { if (confirm(`Rotate secret ${r.name}? A new random value is generated.`)) { await envLogic.rotate(r.name, user); toast.push('Secret rotated.', 'success'); load(); } };
  const copy = (r) => { navigator.clipboard?.writeText?.(r.value); toast.push('Copied to clipboard.', 'success'); };
  const test = async (r) => { const res = await envLogic.test(r.name); toast.push(`${r.name}: ${res.message}`, res.ok ? 'success' : 'error'); };
  const testApi = async (a) => { const res = await envLogic.test(a.keyVar); toast.push(`${a.name}: ${res.ok ? 'Connected' : 'Not configured'}`, res.ok ? 'success' : 'error'); };

  const display = (r) => {
    if (!r.hasValue) return <span className="muted">unset</span>;
    if (!r.secret) return <code>{r.value}</code>;
    return <code>{revealed[r.name] ? r.value : r.masked}</code>;
  };

  const secrets = rows.filter((r) => r.secret);
  const apiStats = {
    connected: apis.filter((a) => a.status === 'connected').length,
    disconnected: apis.filter((a) => a.status === 'disconnected').length,
    total: apis.length,
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="gear"
        title="Environment & API Manager"
        subtitle="Centralised management of environment variables, API configurations, secrets and configuration history. Secrets are masked; values resolve from environment variables."
        actions={tab === 'Environment Variables' && <PermissionGate perm="env.create"><Button icon="plus" onClick={() => setEditing({ name: '', value: '', status: 'enabled' })}>Add Variable</Button></PermissionGate>}
      />

      <div className="tabs">
        {TABS.map((t) => <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</div>)}
      </div>

      {tab === 'Environment Variables' && (
        <>
          <div className="toolbar-row">
            <div className="datatable__search env-api__search">
              <Icon name="search" size={15} />
              <input placeholder="Search variables…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <select className="select env-api__category-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>{ENV_CATEGORY_KEYS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Card bodyClass="card__body--flush">
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Variable Name</th><th>Category</th><th>Value</th><th>Status</th><th>Last Updated</th><th>Updated By</th><th className="env-api__actions-lg">Actions</th></tr></thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.name}>
                      <td className="env-api__var-name">{r.name}</td>
                      <td><Badge tone="grey">{r.category}</Badge></td>
                      <td>{display(r)}</td>
                      <td><Badge tone={r.status === 'enabled' ? 'green' : r.status === 'disabled' ? 'amber' : 'grey'} dot>{r.status}</Badge></td>
                      <td>{r.updatedAt ? formatDateTime(r.updatedAt) : '—'}</td>
                      <td>{r.updatedBy || '—'}</td>
                      <td>
                        <div className="row-actions">
                          {r.secret && r.hasValue && canSecrets && <button className="iconbtn" title={revealed[r.name] ? 'Hide' : 'Reveal'} onClick={() => setRevealed((s) => ({ ...s, [r.name]: !s[r.name] }))}><Icon name="eye" size={15} /></button>}
                          {r.hasValue && canSecrets && <button className="iconbtn" title="Copy" onClick={() => copy(r)}><Icon name="copy" size={15} /></button>}
                          <PermissionGate perm="env.edit"><button className="iconbtn" title="Edit" onClick={() => setEditing({ name: r.name, value: r.persisted ? r.value : '', status: r.status === 'unset' ? 'enabled' : r.status })}><Icon name="edit" size={15} /></button></PermissionGate>
                          <PermissionGate perm="env.edit"><button className="iconbtn" title={r.status === 'enabled' ? 'Disable' : 'Enable'} onClick={() => toggle(r)}><Icon name={r.status === 'enabled' ? 'close' : 'check'} size={15} /></button></PermissionGate>
                          {r.secret && <PermissionGate perm="env.secrets"><button className="iconbtn" title="Rotate secret" onClick={() => rotate(r)}><Icon name="refresh" size={15} /></button></PermissionGate>}
                          <PermissionGate perm="env.sync"><button className="iconbtn" title="Test" onClick={() => test(r)}><Icon name="bolt" size={15} /></button></PermissionGate>
                          {r.persisted && <PermissionGate perm="env.delete"><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => del(r)}><Icon name="trash" size={15} /></button></PermissionGate>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="alert alert--warn mt-14">
            <Icon name="alert" size={16} />
            <span>Client-side demo: managed values persist locally and are masked in the UI. In production, store secrets only in environment variables on the backend and sync to your deployment platform (Railway / Render / Fly.io / Docker).</span>
          </div>
        </>
      )}

      {tab === 'API Manager' && (
        <Card title="API Configurations" sub="Connection state derives from whether the configuring variable is set.">
          <div className="table-scroll">
            <table className="table">
                <thead><tr><th>API Name</th><th>Provider</th><th>Status</th><th>Key Variable</th><th className="env-api__actions-sm">Actions</th></tr></thead>
                <tbody>
                  {apis.map((a) => (
                    <tr key={a.name}>
                      <td className="font-medium">{a.name}</td>
                    <td>{a.provider}</td>
                    <td><Badge tone={a.status === 'connected' ? 'green' : 'amber'} dot>{a.status}</Badge></td>
                    <td><code>{a.keyVar}</code></td>
                    <td><PermissionGate perm="api.test"><Button size="sm" variant="ghost" icon="bolt" onClick={() => testApi(a)}>Test</Button></PermissionGate></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'Secret Manager' && (
        <Card title="Secret Manager" sub="Sensitive values are masked. Reveal requires the env.secrets permission.">
          {!canSecrets && <div className="alert alert--warn mb-12"><Icon name="lock" size={15} /><span>You do not have permission to reveal secret values.</span></div>}
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Secret</th><th>Category</th><th>Value</th><th className="env-api__actions-md">Actions</th></tr></thead>
              <tbody>
                {secrets.map((r) => (
                  <tr key={r.name}>
                    <td className="env-api__var-name">{r.name}</td>
                    <td><Badge tone="grey">{r.category}</Badge></td>
                    <td>{r.hasValue ? <code>{revealed[r.name] && canSecrets ? r.value : r.masked}</code> : <span className="muted">unset</span>}</td>
                    <td>
                      <div className="row-actions">
                        {r.hasValue && canSecrets && <button className="iconbtn" title={revealed[r.name] ? 'Hide' : 'Reveal'} onClick={() => setRevealed((s) => ({ ...s, [r.name]: !s[r.name] }))}><Icon name="eye" size={15} /></button>}
                        <PermissionGate perm="env.secrets"><button className="iconbtn" title="Rotate" onClick={() => rotate(r)}><Icon name="refresh" size={15} /></button></PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'Sync Status' && (
        <Card title="Deployment Sync Status" sub="Environment changes can be synced to the deployment platform.">
          <div className="health-grid">
            <Stat label="Connected APIs" value={apiStats.connected} icon="check" />
            <Stat label="Disconnected" value={apiStats.disconnected} icon="alert" />
            <Stat label="Total APIs" value={apiStats.total} icon="bolt" />
            <Stat label="Managed Variables" value={rows.filter((r) => r.persisted).length} icon="gear" />
          </div>
          <div className="alert alert--info mt-14">
            <Icon name="refresh" size={15} />
            <span>Auto-deployment sync targets (Railway / Render / Fly.io / Koyeb / VPS / Docker) push variable changes to the platform and optionally trigger a restart. Configure via backend integration.</span>
          </div>
        </Card>
      )}

      {tab === 'Configuration History' && (
        <Card title="Configuration History" sub="Every environment change is recorded (values masked).">
          {history.length === 0 ? <EmptyState icon="history" title="No changes recorded yet." /> : (
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Variable</th><th>Old Value</th><th>New Value</th><th>Changed By</th><th>Date</th></tr></thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td className="env-api__var-name">{h.name}</td>
                      <td><code>{h.oldValue || '—'}</code></td>
                      <td><code>{h.newValue || '—'}</code></td>
                      <td>{h.changedBy}</td>
                      <td>{formatDateTime(h.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Modal open={!!editing} title={editing?.name && rows.some((r) => r.name === editing.name) ? `Edit ${editing.name}` : 'Add Variable'} onClose={() => setEditing(null)}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button icon="save" onClick={save}>Save</Button></>}>
        {editing && (
          <>
            <Field label="Variable Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="E.G. OPENAI_API_KEY" className="input--mono" /></Field>
            <Field label="Value" hint="Stored locally for this demo; production secrets belong in backend environment variables."><Input value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} /></Field>
            <Field label="Status"><Select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}><option value="enabled">Enabled</option><option value="disabled">Disabled</option></Select></Field>
          </>
        )}
      </Modal>
    </div>
  );
}

function Stat({ label, value, icon }) {
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


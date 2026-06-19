import React, { useEffect, useState } from 'react';
import { SchemaMappingService } from '@/services/schemaMappingService.js';
import { ProviderCapabilitiesService } from '@/services/providerCapabilitiesService.js';
import { listSchemas } from '@/data-provider/schema/index.js';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import Spinner from '@/components/Spinner.jsx';

const TABS = [
  { id: 'entities', label: 'Entity Mapping' },
  { id: 'fields', label: 'Field Mapping' },
  { id: 'relationships', label: 'Relationship Mapping' },
  { id: 'versions', label: 'Version History' },
  { id: 'import', label: 'Import/Export' },
];

export default function SchemaMappingManager() {
  const [mappings, setMappings] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [unmapped, setUnmapped] = useState([]);
  const [versions, setVersions] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [exportData, setExportData] = useState(null);
  const [activeTab, setActiveTab] = useState('entities');
  const [validationResult, setValidationResult] = useState(null);
  const [rollbackVersion, setRollbackVersion] = useState('');
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [newRel, setNewRel] = useState({ fromEntity: '', fromField: '', toEntity: '', toField: 'id', cascadeDelete: false });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true); setError('');
    try {
      const [m, c, u, v, r] = await Promise.all([
        SchemaMappingService.listMappings(),
        SchemaMappingService.detectConflicts(),
        SchemaMappingService.detectUnmapped(),
        SchemaMappingService.listVersions(),
        SchemaMappingService.listRelationships(),
      ]);
      setMappings(m); setConflicts(c); setUnmapped(u); setVersions(v); setRelationships(r);
    } catch (e) {
      setError(e.message || 'Failed to load mappings');
    }
    setLoading(false);
  };

  const handleSave = async (entityName) => {
    if (!editValue) return;
    await SchemaMappingService.setMapping(entityName, editValue, 'Updated via Schema Mapping Manager');
    setEditing(null); setEditValue('');
    loadAll();
  };

  const handleReset = async () => {
    if (!confirm('Reset all mappings to defaults? This cannot be undone.')) return;
    await SchemaMappingService.resetDefaults();
    loadAll();
  };

  const handleExport = async () => {
    const data = await SchemaMappingService.exportMappings();
    setExportData(JSON.stringify(data, null, 2));
  };

  const handleImport = async () => {
    if (!importText) { setError('No import data provided'); return; }
    try {
      const parsed = JSON.parse(importText);
      const res = await SchemaMappingService.importMappings(parsed);
      if (res.ok) {
        setImportResult(res);
        setImportText('');
        loadAll();
      } else {
        setError('Import failed: ' + (res.error || 'Unknown error'));
      }
    } catch {
      setError('Invalid JSON format');
    }
  };

  const handleSnapshot = async () => {
    const desc = prompt('Snapshot description:') || '';
    await SchemaMappingService.saveSnapshot(desc);
    loadAll();
  };

  const handleRollback = async () => {
    if (!rollbackVersion) { setError('Select a version to rollback to'); return; }
    if (!confirm(`Rollback mappings to version ${rollbackVersion}? Current state will be overwritten.`)) return;
    const res = await SchemaMappingService.rollbackToVersion(rollbackVersion);
    if (res.ok) { setRollbackVersion(''); loadAll(); }
    else setError(res.error || 'Rollback failed');
  };

  const handleAddRelationship = async () => {
    if (!newRel.fromEntity || !newRel.fromField || !newRel.toEntity) {
      setError('From entity, from field, and to entity are required');
      return;
    }
    const res = await SchemaMappingService.createRelationship({
      fromEntity: newRel.fromEntity,
      fromField: newRel.fromField,
      toEntity: newRel.toEntity,
      toField: newRel.toField || 'id',
      cascadeDelete: newRel.cascadeDelete,
    });
    if (res.ok) {
      setNewRel({ fromEntity: '', fromField: '', toEntity: '', toField: 'id', cascadeDelete: false });
      loadAll();
    } else {
      setError(res.error || 'Failed to create relationship');
    }
  };

  const handleValidate = async () => {
    setValidationResult({ loading: true });
    const schemas = listSchemas();
    const results = [];
    for (const s of schemas) {
      const v = await SchemaMappingService.validateMapping(s.collection);
      results.push(v);
    }
    setValidationResult({ loading: false, results });
  };

  if (loading) return <div className="page-center"><Spinner size={32} /></div>;

  const schemas = listSchemas();

  return (
    <div className="fade-in">
      <PageHeader icon="database" title="Schema Mapping Manager"
        subtitle="Configure LexAI entity ↔ provider table and field name mappings" />

      {error && <div className="alert alert--error"><Icon name="alert" size={16} /><span>{error}</span></div>}

      {/* Conflicts Banner */}
      {conflicts.length > 0 && (
        <div className="alert alert--warn dm-mb">
          <Icon name="alert" size={16} />
          <span>Mapping conflicts: {conflicts.map((c) => `"${c.table}" → ${c.entities.join(', ')}`).join('; ')}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs dm-mb" style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border-color)', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 16px', border: 'none', background: activeTab === t.id ? 'var(--bg-active)' : 'transparent',
              color: activeTab === t.id ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer',
              borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2, fontWeight: activeTab === t.id ? 600 : 400,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== TAB: Entity Mapping ===== */}
      {activeTab === 'entities' && (
        <>
          <div className="toolbar-row dm-mb" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button variant="outline" size="sm" icon="save" onClick={handleSnapshot}>Save Snapshot</Button>
            <Button variant="ghost" size="sm" icon="refresh" onClick={loadAll}>Refresh</Button>
            <Button variant="ghost" size="sm" icon="reset" onClick={handleReset}>Reset Defaults</Button>
          </div>

          <Card>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Provider Table</th>
                  <th>Fields</th>
                  <th>Status</th>
                  <th>Version</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappings.length === 0 && (
                  <tr><td colSpan={6} className="text-muted" style={{ textAlign: 'center' }}>No mappings configured</td></tr>
                )}
                {mappings.map((m) => (
                  <tr key={m.id || m.entity_name}>
                    <td><code>{m.entity_name}</code></td>
                    <td>
                      {editing === m.entity_name ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave(m.entity_name)}
                            style={{ width: 140 }} />
                          <Button size="xs" variant="primary" onClick={() => handleSave(m.entity_name)}>Save</Button>
                          <Button size="xs" variant="ghost" onClick={() => setEditing(null)}>X</Button>
                        </div>
                      ) : (
                        <code>{m.provider_table}</code>
                      )}
                    </td>
                    <td><span className="text-muted">{(m.fields || []).length} fields</span></td>
                    <td>{m.active ? <span className="badge badge--success">Active</span> : <span className="badge badge--muted">Inactive</span>}</td>
                    <td>{m.version || 1}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button size="xs" variant="ghost" icon="edit"
                          onClick={() => { setEditing(m.entity_name); setEditValue(m.provider_table); }}>Edit</Button>
                        {m.active && (
                          <Button size="xs" variant="ghost" icon="trash"
                            onClick={async () => { await SchemaMappingService.removeMapping(m.entity_name); loadAll(); }}>Remove</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Unmapped Entities */}
          {unmapped.length > 0 && (
            <Card className="dm-mt">
              <h3 className="card-title">Unmapped Entities ({unmapped.length})</h3>
              <p className="auth-sub--sm">These entities use their name as the default table name.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {unmapped.map((name) => (
                  <span key={name} className="badge badge--muted">{name}</span>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ===== TAB: Field Mapping ===== */}
      {activeTab === 'fields' && (
        <Card>
          <h3 className="card-title">Field-Level Mapping</h3>
          <p className="auth-sub--sm">Validate field definitions across all entities. Fields are mapped by name — use the schema definitions as the source of truth.</p>
          <Button variant="outline" size="sm" onClick={handleValidate} style={{ marginBottom: 12 }}>
            Validate All Entities
          </Button>
          {validationResult && !validationResult.loading && (
            <table className="data-table">
              <thead>
                <tr><th>Entity</th><th>Mapped Table</th><th>Fields</th><th>Status</th></tr>
              </thead>
              <tbody>
                {validationResult.results.map((r) => (
                  <tr key={r.entity}>
                    <td><code>{r.entity}</code></td>
                    <td><code>{r.mappedTable}</code></td>
                    <td>{r.fields.length} fields</td>
                    <td><span className="badge badge--success">Valid</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ===== TAB: Relationship Mapping ===== */}
      {activeTab === 'relationships' && (
        <Card>
          <h3 className="card-title">Relationship Mapping</h3>
          <p className="auth-sub--sm">Define foreign key relationships between entities.</p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            <select value={newRel.fromEntity} onChange={(e) => setNewRel({ ...newRel, fromEntity: e.target.value })}
              style={{ padding: '4px 8px' }}>
              <option value="">From Entity</option>
              {schemas.map((s) => <option key={s.collection} value={s.collection}>{s.collection}</option>)}
            </select>
            <input placeholder="From Field" value={newRel.fromField} onChange={(e) => setNewRel({ ...newRel, fromField: e.target.value })}
              style={{ padding: '4px 8px', width: 100 }} />
            <span>→</span>
            <select value={newRel.toEntity} onChange={(e) => setNewRel({ ...newRel, toEntity: e.target.value })}
              style={{ padding: '4px 8px' }}>
              <option value="">To Entity</option>
              {schemas.map((s) => <option key={s.collection} value={s.collection}>{s.collection}</option>)}
            </select>
            <input placeholder="To Field" value={newRel.toField} onChange={(e) => setNewRel({ ...newRel, toField: e.target.value })}
              style={{ padding: '4px 8px', width: 100 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={newRel.cascadeDelete} onChange={(e) => setNewRel({ ...newRel, cascadeDelete: e.target.checked })} />
              Cascade
            </label>
            <Button size="xs" variant="primary" onClick={handleAddRelationship}>Add</Button>
          </div>

          {relationships.length === 0 ? (
            <p className="text-muted">No relationships defined</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>From</th><th>Field</th><th>To</th><th>Field</th><th>Cascade</th><th>Status</th></tr>
              </thead>
              <tbody>
                {relationships.map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.fromEntity}</code></td>
                    <td><code>{r.fromField}</code></td>
                    <td><code>{r.toEntity}</code></td>
                    <td><code>{r.toField}</code></td>
                    <td>{r.cascadeDelete ? <span className="badge badge--success">Yes</span> : <span className="badge badge--muted">No</span>}</td>
                    <td>{r.enabled ? <span className="badge badge--success">Active</span> : <span className="badge badge--muted">Disabled</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ===== TAB: Version History ===== */}
      {activeTab === 'versions' && (
        <Card>
          <h3 className="card-title">Mapping Version History ({versions.length})</h3>
          <p className="auth-sub--sm">Snapshots of the entire mapping set. Select a version to rollback to.</p>

          {versions.length === 0 ? (
            <p className="text-muted">No versions saved. Use "Save Snapshot" to create a version.</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                <select value={rollbackVersion} onChange={(e) => setRollbackVersion(e.target.value)} style={{ padding: '4px 8px', flex: 1 }}>
                  <option value="">Select version to rollback to...</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>v{v.version} — {v.description || 'No description'} ({v.created_at ? new Date(v.created_at).toLocaleDateString() : ''})</option>
                  ))}
                </select>
                <Button size="xs" variant="outline" icon="reset" onClick={handleRollback}
                  disabled={!rollbackVersion}>Rollback to Version</Button>
              </div>
              <table className="data-table">
                <thead>
                  <tr><th>Version</th><th>Description</th><th>Created At</th></tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.id}>
                      <td>{v.version}</td>
                      <td>{v.description || '-'}</td>
                      <td>{v.created_at ? new Date(v.created_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>
      )}

      {/* ===== TAB: Import/Export ===== */}
      {activeTab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <h3 className="card-title">Export Mapping</h3>
            <Button variant="outline" size="sm" icon="download" onClick={handleExport}>Generate Export JSON</Button>
            {exportData && (
              <>
                <pre className="code-block" style={{ maxHeight: 300, overflow: 'auto', marginTop: 8 }}>{exportData}</pre>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(exportData); }}
                  style={{ marginTop: 8 }}>Copy to Clipboard</Button>
              </>
            )}
          </Card>

          <Card>
            <h3 className="card-title">Import Mapping</h3>
            <p className="auth-sub--sm">Paste JSON mapping data (format: lexai-schema-mapping-v1).</p>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)}
              style={{ width: '100%', minHeight: 120, padding: 8, fontFamily: 'monospace', fontSize: 13 }}
              placeholder='{"format":"lexai-schema-mapping-v1","mappings":[{"entity":"users","table":"app_users","active":true}]}' />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button variant="primary" size="sm" icon="upload" onClick={handleImport}>Import</Button>
              <Button variant="ghost" size="sm" onClick={() => { setImportText(''); setImportResult(null); }}>Clear</Button>
            </div>
            {importResult && (
              <div style={{ marginTop: 8 }}>
                <p className="text-success">Import completed: {importResult.results.filter((r) => r.ok).length} succeeded, {importResult.results.filter((r) => !r.ok).length} failed</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

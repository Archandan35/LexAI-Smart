import { useState, useEffect } from 'react';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import { downloadFile } from '@/utils/exportData.js';
import { bytes } from '@/utils/format.js';
import { listSchemas } from '@/data-provider/schema/index.js';
import { config } from '@/config/config.js';
import { sha256Hex } from '@/utils/crypto.js';
import { backupFileName } from '@/logic/backupLogic.js';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';

const FORMATS = [
  { value: 'udb', label: '.udb (Universal Database)' },
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'sql', label: 'SQL' },
];

export default function DmcExportCenter() {
  const toast = useToast();
  const [format, setFormat] = useState('udb');
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [done, setDone] = useState(false);
  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const schemas = listSchemas();
        const counts = await databaseAdminService.counts();
        const items = schemas.map(s => ({
          name: s.collection,
          label: s.label || s.collection,
          core: !!s.core,
          count: counts[s.collection] ?? 0,
        }));
        setCollections(items);
        setSelected(Object.fromEntries(items.map(i => [i.name, true])));
      } catch {
        toast.push('Failed to load collections.', 'error');
      }
    };
    load();
  }, []);

  const toggle = (name) => {
    setSelected(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const selectAll = () => {
    setSelected(Object.fromEntries(collections.map(i => [i.name, true])));
  };

  const deselectAll = () => {
    setSelected(Object.fromEntries(collections.map(i => [i.name, false])));
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const selectedNames = collections.filter(c => selected[c.name]).map(c => c.name);

  const estimateSize = async () => {
    if (!selectedCount) { toast.push('No collections selected.', 'warn'); return; }
    try {
      const data = await databaseAdminService.snapshot(selectedNames);
      const size = new Blob([JSON.stringify(data)]).size;
      setEstimate({ size, collections: Object.keys(data).length });
      toast.push(`Estimated size: ${bytes(size)}`, 'info');
    } catch { toast.push('Could not estimate size.', 'error'); }
  };

  const generate = async () => {
    if (!selectedCount) { toast.push('Select at least one collection.', 'warn'); return; }
    setGenerating(true);
    try {
      const data = await databaseAdminService.snapshot(selectedNames);
      if (format === 'udb') {
        const payload = JSON.stringify(data);
        const checksum = await sha256Hex(payload);
        const now = new Date();
        const snap = {
          format: 'UDB', udbVersion: '1.0', appVersion: config.app.version,
          schemaVersion: 15, createdAt: now.toISOString(), checksum,
          encryption: false, collections: Object.keys(data),
          counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])),
          data,
        };
        downloadFile(backupFileName(now), JSON.stringify(snap, null, 2), 'application/octet-stream');
      } else if (format === 'json') {
        downloadFile(`export_${Date.now()}.json`, JSON.stringify(data, null, 2), 'application/json');
      } else {
        toast.push('Format not implemented.', 'error');
      }
      setDone(true);
      toast.push('Export generated.', 'success');
    } catch (e) {
      toast.push(e?.message || 'Export failed.', 'error');
    }
    setGenerating(false);
  };

  const reset = () => { setDone(false); setEstimate(null); };

  return (
    <>
      <div className="dmc-db-hero dmc-db-hero--sm">
        <div className="dmc-db-hero__icon">
          <Icon name="upload" size={26} />
        </div>
        <div className="dmc-db-hero__text">
          <div className="dmc-db-hero__accent" />
          <h2>Export Center</h2>
          <p>Select the data you want to export, then choose a format and generate.</p>
        </div>
      </div>

      <div className="dmc-db-section">
        <div className="dmc-db-section__head">
          <div className="dmc-db-section__title">
            <Icon name="layers" size={18} /> Data Selection
          </div>
          <span className="dmc-db-section__badge">{selectedCount} / {collections.length} selected</span>
        </div>
        <div className="dmc-db-section__body">
          <div className="dmc-export-select-toolbar">
            <div className="dmc-export-select-actions">
              <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>Deselect All</Button>
            </div>
          </div>
          <div className="dmc-export-collection-list" style={{ marginBottom: 0 }}>
            {collections.map(c => (
              <label key={c.name} className={`dmc-export-collection-item${selected[c.name] ? ' is-selected' : ''}${c.core ? ' is-core' : ''}`}>
                <input type="checkbox" checked={!!selected[c.name]} onChange={() => toggle(c.name)} />
                <span className="dmc-export-collection-label">{c.label}</span>
                <span className="dmc-export-collection-name">{c.name}</span>
                <span className="dmc-export-collection-count">{c.count} records</span>
                {c.core && <span className="dmc-badge dmc-badge--navy">core</span>}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="dmc-db-section">
        <div className="dmc-db-section__head">
          <div className="dmc-db-section__title">
            <Icon name="settings" size={18} /> Export Options
          </div>
        </div>
        <div className="dmc-db-section__body">
          <div className="dmc-export-grid" style={{ maxWidth: 400, marginBottom: 12 }}>
            <div>
              <label className="dmc-field-label">Format</label>
              <select className="dmc-db-select" style={{ width: '100%' }} value={format} onChange={(e) => setFormat(e.target.value)}>
                {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <div className="dmc-export-checkboxes">
            <label className="dmc-checkbox-label">
              <input type="checkbox" checked={includeAttachments} onChange={() => setIncludeAttachments(!includeAttachments)} /> Include file attachments
            </label>
            <label className="dmc-checkbox-label">
              <input type="checkbox" checked={includeMetadata} onChange={() => setIncludeMetadata(!includeMetadata)} /> Include audit logs
            </label>
          </div>

          <div className="dmc-export-actions">
            <Button variant="ghost" size="sm" onClick={estimateSize} disabled={!selectedCount}>Estimate Size</Button>
            <Button variant="primary" onClick={generate} disabled={generating || !selectedCount}>{generating ? 'Generating…' : 'Generate Export'}</Button>
            {done && <Button variant="ghost" onClick={reset}>New Export</Button>}
          </div>

          {estimate && (
            <div className="dmc-export-estimate">
              Estimated: {bytes(estimate.size)} · {estimate.collections} collections
            </div>
          )}

          {done && (
            <div className="dmc-export-complete">
              <Icon name="check" size={15} /> Export complete. File download started.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

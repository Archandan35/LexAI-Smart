import { useState, useEffect } from 'react';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { backupLogic } from '@/logic/backupLogic.js';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import { downloadFile } from '@/utils/exportData.js';
import { bytes } from '@/utils/format.js';
import { listSchemas } from '@/data-provider/schema/index.js';
import { config } from '@/config/config.js';
import { sha256Hex } from '@/utils/crypto.js';
import { backupFileName } from '@/logic/backupLogic.js';
import PageHeader from '@/components/PageHeader.jsx';
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
  const { user } = useAuth();
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
      <PageHeader icon="upload" title="Export Center" subtitle="Select the data you want to export, then choose a format and generate." />

      <div className="dmc-section">
        <div className="dmc-section__title"><Icon name="layers" size={17} /> Data Selection</div>
        <div className="dmc-export-select-toolbar">
          <span className="dmc-export-count">{selectedCount} / {collections.length} collections selected</span>
          <div className="dmc-export-select-actions">
            <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>Deselect All</Button>
          </div>
        </div>
        <div className="dmc-export-collection-list">
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

      <div className="dmc-section">
        <div className="dmc-section__title"><Icon name="settings" size={17} /> Export Options</div>
        <div className="dmc-export-grid">
          <div>
            <label className="dmc-field-label">Format</label>
            <select className="dmc-select dmc-select-full" value={format} onChange={(e) => setFormat(e.target.value)}>
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
    </>
  );
}

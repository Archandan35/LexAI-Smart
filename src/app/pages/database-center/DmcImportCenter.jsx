import { useState, useRef } from 'react';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { backupLogic } from '@/logic/backupLogic.js';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import { listSchemas } from '@/data-provider/schema/index.js';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';

const STEPS = ['Upload', 'Detect', 'Validate', 'Preview', 'Import', 'Verify', 'Complete'];
const FORMATS = ['.udb', 'JSON', 'CSV', 'SQL', 'Excel', 'XML', 'BSON'];

function extractCollections(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data)
    .filter(([, rows]) => Array.isArray(rows) && rows.length > 0)
    .map(([name, rows]) => ({ name, count: rows.length }));
}

function getKnownNames() {
  try { return new Set(listSchemas().map(s => s.collection)); } catch { return new Set(); }
}

export default function DmcImportCenter() {
  const toast = useToast();
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState(null);
  const [detectedFormat, setDetectedFormat] = useState('');
  const [validation, setValidation] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [fileCollections, setFileCollections] = useState([]);
  const [selectedImport, setSelectedImport] = useState({});

  const detectFormat = (name) => {
    if (!name) return 'Unknown';
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'udb') return '.udb';
    if (ext === 'json') return 'JSON';
    if (ext === 'csv') return 'CSV';
    if (ext === 'sql') return 'SQL';
    if (ext === 'xlsx' || ext === 'xls') return 'Excel';
    if (ext === 'xml') return 'XML';
    if (ext === 'bson') return 'BSON';
    return 'Unknown';
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setDetectedFormat(detectFormat(file.name));
    const text = await file.text();
    setFileContent(text);
    setStep(1);

    if (file.name.endsWith('.udb')) {
      const parsed = await backupLogic.parseImport(text);
      setValidation(parsed);
      if (parsed.ok) {
        const cols = extractCollections(parsed.snapshot.data);
        setFileCollections(cols);
        setSelectedImport(Object.fromEntries(cols.map(c => [c.name, true])));
      } else {
        setFileCollections([]);
        setSelectedImport({});
      }
      setStep(parsed.ok ? 2 : 2);
    } else if (file.name.endsWith('.json')) {
      let data;
      try {
        data = JSON.parse(text);
        const ok = { ok: true, reason: 'Valid JSON' };
        setValidation(ok);
        const source = data.data || data;
        const cols = extractCollections(source);
        setFileCollections(cols);
        setSelectedImport(Object.fromEntries(cols.map(c => [c.name, true])));
      } catch {
        setValidation({ ok: false, reason: 'Invalid JSON' });
        setFileCollections([]);
        setSelectedImport({});
      }
    } else {
      setValidation({ ok: true, reason: `Format: ${detectFormat(file.name)} — preview not available` });
    }
  };

  const toggleImport = (name) => {
    setSelectedImport(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const selectAllImport = () => {
    setSelectedImport(Object.fromEntries(fileCollections.map(c => [c.name, true])));
  };

  const deselectAllImport = () => {
    setSelectedImport({});
  };

  const selectedImportCount = Object.values(selectedImport).filter(Boolean).length;
  const knownNames = getKnownNames();

  const doImport = async () => {
    if (!selectedImportCount && fileCollections.length > 0) {
      toast.push('Select at least one collection to import.', 'warn');
      return;
    }
    setImporting(true);
    try {
      if (detectedFormat === '.udb' && validation?.ok) {
        const snap = validation.snapshot || JSON.parse(fileContent);
        if (selectedImportCount < fileCollections.length) {
          const filtered = { ...snap, data: {} };
          for (const [name, rows] of Object.entries(snap.data || {})) {
            if (selectedImport[name]) filtered.data[name] = rows;
          }
          snap.data = filtered.data;
        }
        const res = await backupLogic.importBackup(snap, { restoreNow: false }, user);
        if (res.ok) {
          setResult({ success: true, name: res.value.backup.name, records: res.value.backup.counts });
          setStep(5);
        } else {
          setResult({ success: false, error: res.error });
          setStep(5);
        }
      } else if (detectedFormat === 'JSON') {
        const raw = JSON.parse(fileContent);
        const source = raw.data || raw;
        const toImport = {};
        for (const [name, rows] of Object.entries(source)) {
          if (selectedImport[name]) toImport[name] = rows;
        }
        if (Object.keys(toImport).length === 0) {
          toast.push('No data to import.', 'warn');
          setImporting(false);
          return;
        }
        await databaseAdminService.restore(toImport);
        setResult({ success: true, name: fileName });
        setStep(5);
      } else {
        setResult({ success: false, error: 'Format not yet supported for direct import.' });
        setStep(5);
      }
    } catch (err) {
      setResult({ success: false, error: err.message });
      setStep(5);
    }
    setImporting(false);
  };

  const reset = () => { setStep(0); setFileName(''); setFileContent(null); setValidation(null); setResult(null); setFileCollections([]); setSelectedImport({}); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <>
      <div className="dmc-db-hero dmc-db-hero--sm">
        <div className="dmc-db-hero__icon">
          <Icon name="download" size={26} />
        </div>
        <div className="dmc-db-hero__text">
          <div className="dmc-db-hero__accent" />
          <h2>Import Center</h2>
          <p>Upload a file, review the data it contains, then import.</p>
        </div>
      </div>

      <div className="dmc-db-section">
        <div className="dmc-db-section__head">
          <div className="dmc-db-section__title">
            <Icon name="download" size={18} /> Import Wizard
          </div>
          <span className="dmc-db-section__badge">Step {step + 1} of {STEPS.length}</span>
        </div>
        <div className="dmc-db-section__body">
          <div className="dmc-db-wizard">
            <div className="dmc-db-wizard__steps">
              {STEPS.map((s, i) => (
                <div key={s} className={`dmc-db-wizard__step${i < step ? ' dmc-db-wizard__step--done' : ''}${i === step ? ' dmc-db-wizard__step--active' : ''}`}>
                  <span className="dmc-db-wizard__step-num">{i < step ? '\u2713' : i + 1}</span>
                  {s}
                </div>
              ))}
            </div>

            <div className="dmc-db-wizard__content" style={{ minHeight: step === 0 ? 220 : 'auto' }}>
              {step === 0 && (
                <div className="dmc-import-upload-area">
                  <div className="dmc-import-icon"><Icon name="upload" size={48} /></div>
                  <p className="dmc-import-text">Upload a file to import. Supported formats: {FORMATS.join(', ')}</p>
                  <input ref={fileRef} type="file" accept=".udb,.json,.csv,.sql,.xlsx,.xls,.xml,.bson" onChange={handleFile} className="dmc-hidden-input" />
                  <Button variant="primary" onClick={() => fileRef.current?.click()}>Choose File</Button>
                </div>
              )}

              {step >= 1 && (
                <div>
                  <div className="dmc-db-table-wrap" style={{ marginBottom: 16 }}>
                    <table className="dmc-db-table">
                      <thead><tr><th>Property</th><th>Value</th></tr></thead>
                      <tbody>
                        <tr><td>File</td><td>{fileName}</td></tr>
                        <tr><td>Detected Format</td><td><span className={`dmc-badge dmc-badge--${detectedFormat === 'Unknown' ? 'red' : 'navy'}`}>{detectedFormat}</span></td></tr>
                        <tr><td>Validation</td><td><span className={`dmc-badge dmc-badge--${validation?.ok ? 'green' : 'red'}`}>{validation?.ok ? 'Passed' : 'Failed'}</span></td></tr>
                        <tr><td>Details</td><td>{validation?.reason || '—'}</td></tr>
                        {result && <tr><td>Import Result</td><td><span className={`dmc-badge dmc-badge--${result.success ? 'green' : 'red'}`}>{result.success ? 'Imported' : 'Failed'}</span></td></tr>}
                      </tbody>
                    </table>
                  </div>

                  {step === 2 && fileCollections.length > 0 && (
                    <>
                      <div className="dmc-import-preview-title">
                        <Icon name="layers" size={15} /> Collections detected in file
                        <span className="dmc-import-count-badge">{selectedImportCount} / {fileCollections.length} selected</span>
                      </div>
                      <div className="dmc-import-collection-list">
                        <div className="dmc-import-select-actions">
                          <Button variant="ghost" size="sm" onClick={selectAllImport}>Select All</Button>
                          <Button variant="ghost" size="sm" onClick={deselectAllImport}>Deselect All</Button>
                        </div>
                        {fileCollections.map(c => (
                          <label key={c.name} className="dmc-import-collection-item">
                            <input type="checkbox" checked={!!selectedImport[c.name]} onChange={() => toggleImport(c.name)} />
                            <span className="dmc-import-collection-name">{c.name}</span>
                            <span className="dmc-import-collection-count">{c.count} records</span>
                            {!knownNames.has(c.name) && <span className="dmc-badge dmc-badge--red">unknown schema</span>}
                          </label>
                        ))}
                      </div>
                    </>
                  )}

                  {step < 5 && (
                    <div className="dmc-db-wizard__actions">
                      <Button variant="ghost" onClick={reset}>Cancel</Button>
                      <Button variant="primary" onClick={() => setStep(step + 1)} disabled={!validation?.ok}>Continue</Button>
                    </div>
                  )}

                  {step === 2 && validation?.ok && (
                    <div className="dmc-db-wizard__actions">
                      <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
                      <Button variant="primary" onClick={() => setStep(3)}>Preview</Button>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="dmc-db-wizard__actions">
                      <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
                      <Button variant="primary" onClick={() => setStep(4)}>Continue to Import</Button>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="dmc-db-wizard__actions" style={{ justifyContent: 'flex-end' }}>
                      <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
                      <Button variant="danger" onClick={doImport} disabled={importing || (fileCollections.length > 0 && selectedImportCount === 0)}>{importing ? 'Importing…' : 'Import Data'}</Button>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="dmc-import-result">
                      {result?.success ? (
                        <>
                          <div className="dmc-result-icon-lg"><Icon name="check" size={32} className="dmc-result-icon-green" /></div>
                          <p className="dmc-result-text-bold">Import Complete</p>
                          <p className="dmc-result-text-soft">{result.name} imported successfully.</p>
                        </>
                      ) : (
                        <>
                          <div className="dmc-result-icon-lg"><Icon name="alert" size={32} className="dmc-result-icon-red" /></div>
                          <p className="dmc-result-text-bold">Import Failed</p>
                          <p className="dmc-result-text-soft">{result?.error || 'Unknown error'}</p>
                        </>
                      )}
                      <div className="dmc-import-new-btn"><Button variant="primary" onClick={reset}>Import Another File</Button></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

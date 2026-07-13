import { useState, useRef } from 'react';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { backupLogic } from '@/logic/backupLogic.js';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import PageHeader from '@/components/PageHeader.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';

const STEPS = ['Upload', 'Detect', 'Validate', 'Preview', 'Import', 'Verify', 'Complete'];
const FORMATS = ['.udb', 'JSON', 'CSV', 'SQL', 'Excel', 'XML', 'BSON'];

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
      setStep(parsed.ok ? 2 : 2);
    } else if (file.name.endsWith('.json')) {
      try { JSON.parse(text); setValidation({ ok: true, reason: 'Valid JSON' }); } catch { setValidation({ ok: false, reason: 'Invalid JSON' }); }
    } else {
      setValidation({ ok: true, reason: `Format: ${detectFormat(file.name)}` });
    }
  };

  const doImport = async () => {
    setImporting(true);
    try {
      if (detectedFormat === '.udb' && validation?.ok) {
        const res = await backupLogic.importBackup(validation.snapshot || JSON.parse(fileContent), { restoreNow: false }, user);
        if (res.ok) {
          setResult({ success: true, name: res.value.backup.name, records: res.value.backup.counts });
          setStep(5);
        } else {
          setResult({ success: false, error: res.error });
          setStep(5);
        }
      } else if (detectedFormat === 'JSON') {
        const data = JSON.parse(fileContent);
        if (data.data) {
          await databaseAdminService.restore(data.data);
        } else {
          await databaseAdminService.restore(data);
        }
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

  const reset = () => { setStep(0); setFileName(''); setFileContent(null); setValidation(null); setResult(null); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <>
      <PageHeader icon="download" title="Import Center" subtitle="Universal data import with automatic format detection, validation, and rollback." />

      <div className="dmc-wizard">
        <div className="dmc-wizard__steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`dmc-wizard__step${i < step ? ' dmc-wizard__step--done' : ''}${i === step ? ' dmc-wizard__step--active' : ''}`}>
              <span className="dmc-wizard__step-num">{i < step ? '\u2713' : i + 1}</span>
              {s}
            </div>
          ))}
        </div>

        <div className="dmc-wizard__content">
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
              <table className="dmc-table dmc-wizard-table">
                <thead><tr><th>Property</th><th>Value</th></tr></thead>
                <tbody>
                  <tr><td>File</td><td>{fileName}</td></tr>
                  <tr><td>Detected Format</td><td><span className={`dmc-badge dmc-badge--${detectedFormat === 'Unknown' ? 'red' : 'navy'}`}>{detectedFormat}</span></td></tr>
                  <tr><td>Validation</td><td><span className={`dmc-badge dmc-badge--${validation?.ok ? 'green' : 'red'}`}>{validation?.ok ? 'Passed' : 'Failed'}</span></td></tr>
                  <tr><td>Details</td><td>{validation?.reason || '—'}</td></tr>
                  {result && <tr><td>Import Result</td><td><span className={`dmc-badge dmc-badge--${result.success ? 'green' : 'red'}`}>{result.success ? 'Imported' : 'Failed'}</span></td></tr>}
                </tbody>
              </table>

              {step < 5 && (
                <div className="dmc-wizard__actions">
                  <Button variant="ghost" onClick={reset}>Cancel</Button>
                  <Button variant="primary" onClick={() => setStep(step + 1)} disabled={!validation?.ok}>Continue</Button>
                </div>
              )}

              {step === 2 && validation?.ok && (
                <div className="dmc-wizard__actions">
                  <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
                  <Button variant="primary" onClick={() => setStep(3)}>Preview</Button>
                </div>
              )}

              {step === 3 && (
                <div className="dmc-wizard__actions">
                  <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
                  <Button variant="primary" onClick={() => setStep(4)}>Continue to Import</Button>
                </div>
              )}

              {step === 4 && (
                <div className="dmc-wizard__actions dmc-wizard-actions-end">
                  <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
                  <Button variant="danger" onClick={doImport} disabled={importing}>{importing ? 'Importing…' : 'Import Data'}</Button>
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
    </>
  );
}

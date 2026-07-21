import { useState } from 'react';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import { Feedback, ProgressBar, tryOk, tryErr } from './utils.js';

export default function BulkImport({ config, entity }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState([]);

  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFile(f); setErrors([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
      const headers = lines[0]?.split(',').map((h) => h.trim().toLowerCase()) || [];
      const data = lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      });
      setPreview(data.slice(0, 5));
    };
    reader.readAsText(f);
  };

  const submit = async () => {
    if (!file) { setMsg({ type: 'error', text: 'Select a CSV file first.' }); return; }
    setSaving(true); setMsg(null); setErrors([]);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
      const total = lines.length - 1;
      setProgress({ current: 0, total });
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map((v) => v.trim());
        const obj = {};
        const headerRow = lines[0].split(',').map((h) => h.trim().toLowerCase());
        headerRow.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
        try {
          const r = entity === 'Stage' ? await config.logic.add(obj) : await config.logic.create(obj, config.actor);
          if (tryOk(r)) imported++;
          else setErrors((prev) => [...prev, `Row ${i}: ${tryErr(r)}`]);
        } catch (e) { setErrors((prev) => [...prev, `Row ${i}: ${e.message}`]); }
        setProgress({ current: i, total });
      }
      setMsg({ type: 'success', text: `${imported} of ${total} rows imported.` });
      if (!errors.length) { setFile(null); setPreview([]); }
      config.refresh?.();
      setSaving(false);
    };
    reader.readAsText(file);
  };

  const colNames = config.fields.map((f) => f.key).join(', ');

  return (
    <>
      <Feedback msg={msg} />
      {saving && <ProgressBar current={progress.current} total={progress.total} />}
      {errors.length > 0 && (
        <div className="crud-error-log">
          <div className="crud-error-log__head">Errors ({errors.length}):</div>
          {errors.map((e, i) => <div key={i} className="crud-error-log__item">{e}</div>)}
        </div>
      )}
      <div className="crud-import-zone">
        <div className="crud-import-zone__icon"><Icon name="upload" size={24} /></div>
        <div className="crud-import-zone__title">Import from CSV</div>
        <div className="crud-import-zone__sub">CSV columns: <code className="crud-import-code">{colNames}</code></div>
        <label className="crud-import-label">
          <input type="file" accept=".csv,.txt" className="crud-hidden-input" onChange={handleFile} disabled={saving} />
          <span className="btn btn--ghost">{file ? file.name : 'Choose CSV file'}</span>
        </label>
      </div>
      {preview.length > 0 && (
        <div className="crud-field-group">
          <div className="crud-field-label">Preview (first {preview.length} rows)</div>
          <div className="crud-preview">
            {preview.map((row, i) => <div key={i}>{JSON.stringify(row)}</div>)}
          </div>
        </div>
      )}
      {file && (
        <div className="crud-form-actions">
          <Button icon="upload" onClick={submit} disabled={saving}>
            {saving ? `Importing... ${progress.current}/${progress.total}` : `Import ${file.name}`}
          </Button>
        </div>
      )}
    </>
  );
}

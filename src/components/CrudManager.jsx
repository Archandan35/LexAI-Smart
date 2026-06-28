import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { Input, Textarea, Select } from './Field.jsx';

/* ------------------------------------------------------------------ */
/* Tab definitions                                                      */
/* ------------------------------------------------------------------ */
const TABS = [
  { id: 'single-add', label: 'Single Add', icon: 'plus', group: 'single' },
  { id: 'single-edit', label: 'Single Edit', icon: 'edit', group: 'single' },
  { id: 'single-delete', label: 'Single Delete', icon: 'trash', group: 'single', danger: true },
  { id: 'bulk-add', label: 'Bulk Add', icon: 'users', group: 'bulk' },
  { id: 'bulk-edit', label: 'Bulk Edit', icon: 'edit', group: 'bulk' },
  { id: 'bulk-delete', label: 'Bulk Delete', icon: 'trash', group: 'bulk', danger: true },
  { id: 'import', label: 'Import', icon: 'upload', group: 'import', special: 'import' },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function tryOk(r) {
  if (!r) return false;
  return r.ok === true || r.ok === undefined || !!r.id;
}
function tryErr(r) {
  if (!r) return 'Unknown error';
  return r.error || r.message || 'Operation failed';
}

function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="crud-progress">
      <div className="crud-progress__bar">
        <div className="crud-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="crud-progress__text">{current} / {total} ({pct}%)</div>
    </div>
  );
}

function useItems(logic) {
  const [items, setItems] = useState([]);
  const refresh = () =>
    logic.list().then((r) => setItems(Array.isArray(r) ? r : [])).catch(() => setItems([]));
  useEffect(() => { refresh(); }, []);
  return { items, refresh };
}

/* ------------------------------------------------------------------ */
/* Inline feedback                                                      */
/* ------------------------------------------------------------------ */
function Feedback({ msg }) {
  if (!msg) return null;
  return (
    <div className={`crud-toast${msg.type === 'error' ? ' crud-toast--error' : ''}`}>
      <Icon name={msg.type === 'error' ? 'alert' : 'check'} size={15} />
      {msg.text}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tip box                                                              */
/* ------------------------------------------------------------------ */
function TipBox({ text }) {
  return (
    <div className="crud-tip">
      <div className="crud-tip__icon"><Icon name="bolt" size={17} /></div>
      <div>
        <div className="crud-tip__title">Tip</div>
        <div className="crud-tip__text">{text}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Generic field renderer                                               */
/* ------------------------------------------------------------------ */
function renderField(f, values, setValues) {
  const val = values[f.key] ?? '';
  const set = (v) => setValues({ ...values, [f.key]: v });

  if (f.type === 'color') {
    return (
      <div key={f.key} style={{ marginBottom: 16 }}>
        <div className="crud-field-label">
          <span>{f.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="color" className="input" style={{ width: 56, height: 40, padding: 4, cursor: 'pointer' }}
            value={val || f.default || '#6b7280'} onChange={(e) => set(e.target.value)} />
          <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{val || f.default || '#6b7280'}</span>
        </div>
      </div>
    );
  }

  if (f.key === 'status') {
    const active = val === 'Active' || val === '';
    return (
      <div key={f.key} style={{ marginBottom: 16 }}>
        <div className="crud-field-label">
          <span>{f.label}</span><span className="req">*</span>
        </div>
        <div className="crud-status-select">
          <span className="crud-status-dot" style={{ background: active ? 'var(--green)' : 'var(--text-faint)' }} />
          <Select value={val} onChange={(e) => set(e.target.value)}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Select>
        </div>
        <div className="crud-field-hint">Select status for this {f.entityLabel || 'item'}</div>
      </div>
    );
  }

  const isDesc = f.key === 'description';
  const charMax = isDesc ? 250 : null;

  return (
    <div key={f.key} style={{ marginBottom: 16 }}>
      <div className="crud-field-label">
        <span>{f.label}</span>
        {f.required !== false && <span className="req">*</span>}
        {f.optional && <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>&nbsp;(Optional)</span>}
      </div>
      {isDesc ? (
        <div className={`crud-input-icon crud-input-icon--top`}>
          <span className="crud-input-icon__ico"><Icon name="file" size={15} /></span>
          <textarea
            className="textarea"
            style={{ paddingLeft: 38, minHeight: 90, resize: 'vertical' }}
            value={val}
            placeholder={f.placeholder || f.label}
            maxLength={charMax}
            onChange={(e) => set(e.target.value)}
          />
        </div>
      ) : f.type === 'password' ? (
        <div className="crud-input-icon">
          <span className="crud-input-icon__ico"><Icon name="lock" size={15} /></span>
          <Input type="password" value={val} placeholder={f.placeholder || f.label} onChange={(e) => set(e.target.value)} />
        </div>
      ) : (
        <div className="crud-input-icon">
          <span className="crud-input-icon__ico">
            {f.key === 'short_code'
              ? <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy-600)' }}>Aa</span>
              : <Icon name="notes" size={15} />}
          </span>
          <Input
            value={val}
            placeholder={f.placeholder || f.label}
            onChange={(e) => set(e.target.value)}
            maxLength={f.maxLength}
          />
        </div>
      )}
      {f.hint && <div className="crud-field-hint">{f.hint}</div>}
      {isDesc && (
        <div className="crud-field-hint" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Maximum {charMax} characters</span>
          <span>{val.length} / {charMax}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Single Add                                                           */
/* ------------------------------------------------------------------ */
function SingleAdd({ config, entity }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async () => {
    setSaving(true); setMsg(null);
    try {
      const r = entity === 'Stage'
        ? await config.logic.add(values.name)
        : await config.logic.create(values, config.actor);
      if (tryOk(r)) {
        setMsg({ type: 'success', text: `${entity} added successfully.` });
        setValues({});
        config.refresh?.();
      } else setMsg({ type: 'error', text: tryErr(r) });
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    setSaving(false);
  };

  return (
    <>
      <Feedback msg={msg} />
      <div className="crud-form-grid">
        {config.fields.map((f) => (
          <div key={f.key} className={f.full ? 'crud-form-full' : ''}>
            {renderField(f, values, setValues)}
          </div>
        ))}
      </div>
      <div className="crud-form-actions">
        <Button icon="plus" onClick={submit} disabled={saving}>
          {saving ? 'Adding...' : `Add ${entity}`}
        </Button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Single Edit                                                          */
/* ------------------------------------------------------------------ */
function SingleEdit({ config, entity }) {
  const { items, refresh } = useItems(config.logic);
  const [selected, setSelected] = useState('');
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const pick = (id) => {
    setSelected(id);
    const item = items.find((i) => i.id === id);
    if (item) {
      const v = {};
      config.fields.forEach((f) => { v[f.key] = item[f.key] ?? ''; });
      setValues(v);
    }
  };

  const submit = async () => {
    if (!selected) { setMsg({ type: 'error', text: 'Select an item to edit.' }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await config.logic.update(selected, values, config.actor);
      if (tryOk(r)) { setMsg({ type: 'success', text: `${entity} updated.` }); config.refresh?.(); refresh(); }
      else setMsg({ type: 'error', text: tryErr(r) });
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    setSaving(false);
  };

  return (
    <>
      <Feedback msg={msg} />
      <div style={{ marginBottom: 18 }}>
        <div className="crud-field-label"><span>Select {entity} to Edit</span><span className="req">*</span></div>
        <Select value={selected} onChange={(e) => pick(e.target.value)}>
          <option value="">— choose one —</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </Select>
      </div>
      {selected && (
        <>
          <div className="crud-form-grid">
            {config.fields.map((f) => (
              <div key={f.key} className={f.full ? 'crud-form-full' : ''}>
                {renderField(f, values, setValues)}
              </div>
            ))}
          </div>
          <div className="crud-form-actions">
            <Button icon="check" onClick={submit} disabled={saving}>
              {saving ? 'Saving...' : `Save Changes`}
            </Button>
          </div>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Single Delete                                                        */
/* ------------------------------------------------------------------ */
function SingleDelete({ config, entity }) {
  const { items } = useItems(config.logic);
  const [selected, setSelected] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async () => {
    setSaving(true); setMsg(null);
    try {
      const r = await config.logic.remove(selected, config.actor);
      if (tryOk(r)) {
        setMsg({ type: 'success', text: `${entity} deleted.` });
        setSelected(''); setConfirming(false);
        config.refresh?.();
      } else setMsg({ type: 'error', text: tryErr(r) });
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    setSaving(false);
  };

  return (
    <>
      <Feedback msg={msg} />
      <div style={{ marginBottom: 16 }}>
        <div className="crud-field-label"><span>Select {entity} to Delete</span><span className="req">*</span></div>
        <Select value={selected} onChange={(e) => { setSelected(e.target.value); setConfirming(false); }}>
          <option value="">— choose one —</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </Select>
      </div>
      {selected && !confirming && (
        <div className="crud-form-actions">
          <Button variant="danger" icon="trash" onClick={() => setConfirming(true)}>Delete {entity}</Button>
        </div>
      )}
      {confirming && (
        <div className="crud-confirm">
          <p>This action cannot be undone. Are you sure you want to delete this {entity}?</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="danger" onClick={submit} disabled={saving}>{saving ? 'Deleting...' : 'Yes, Delete'}</Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk Add                                                             */
/* ------------------------------------------------------------------ */
const HAS_CODE = ['Case Type', 'Bench Type', 'Jurisdiction'];

function BulkAdd({ config, entity }) {
  const hasCode = HAS_CODE.includes(entity);
  const [lines, setLines] = useState('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState([]);
  const cancelled = useRef(false);

  const submit = async () => {
    const entries = lines.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!entries.length) { setMsg({ type: 'error', text: 'Enter at least one item.' }); return; }
    setSaving(true); setMsg(null); setErrors([]); cancelled.current = false;
    setProgress({ current: 0, total: entries.length });
    let created = 0;
    for (let i = 0; i < entries.length; i++) {
      if (cancelled.current) break;
      const line = entries[i];
      try {
        let r;
        if (entity === 'Stage') {
          r = await config.logic.add(line);
        } else if (hasCode) {
          const [name, code] = line.split(':').map((s) => s.trim());
          r = await config.logic.create({ name: name || line, short_code: (code || name?.substring(0, 4) || '').toUpperCase(), ...config.defaults }, config.actor);
        } else {
          r = await config.logic.create({ name: line, ...config.defaults }, config.actor);
        }
        if (tryOk(r)) created++;
        else setErrors((prev) => [...prev, `${line}: ${tryErr(r)}`]);
      } catch (e) { setErrors((prev) => [...prev, `${line}: ${e.message}`]); }
      setProgress({ current: i + 1, total: entries.length });
    }
    setMsg({ type: 'success', text: `${created} of ${entries.length} ${entity}(s) created.` });
    if (!errors.length) setLines('');
    config.refresh?.();
    setSaving(false);
  };

  const count = lines.split('\n').filter((l) => l.trim()).length;

  return (
    <>
      <Feedback msg={msg} />
      {saving && <ProgressBar current={progress.current} total={progress.total} />}
      <div style={{ marginBottom: 4 }}>
        <div className="crud-field-label">
          {hasCode ? `Paste entries — Name:CODE per line` : `Paste names — one per line`}
        </div>
        <Textarea
          value={lines}
          onChange={(e) => setLines(e.target.value)}
          rows={8}
          placeholder={hasCode
            ? `Civil Suit:CIV\nCriminal Case:CRL\nWrit Petition:WP`
            : `Item 1\nItem 2\nItem 3`}
          disabled={saving}
        />
      </div>
      {errors.length > 0 && (
        <div className="crud-error-log">
          <div className="crud-error-log__head">Errors ({errors.length}):</div>
          {errors.map((e, i) => <div key={i} className="crud-error-log__item">{e}</div>)}
        </div>
      )}
      <div className="crud-form-actions">
        <Button icon="plus" onClick={submit} disabled={saving || !lines.trim()}>
          {saving ? `Creating... ${progress.current}/${progress.total}` : `Add All (${count})`}
        </Button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk Edit                                                            */
/* ------------------------------------------------------------------ */
function BulkEdit({ config, entity }) {
  const { items } = useItems(config.logic);
  const [selected, setSelected] = useState([]);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState([]);

  const toggle = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const submit = async () => {
    if (!selected.length) { setMsg({ type: 'error', text: 'Select items to edit.' }); return; }
    setSaving(true); setMsg(null); setErrors([]);
    setProgress({ current: 0, total: selected.length });
    let updated = 0;
    for (let i = 0; i < selected.length; i++) {
      const id = selected[i];
      try {
        const r = await config.logic.update(id, values, config.actor);
        if (tryOk(r)) updated++;
        else {
          const item = items.find((x) => x.id === id);
          setErrors((prev) => [...prev, `${item?.name || id}: ${tryErr(r)}`]);
        }
      } catch (e) {
        const item = items.find((x) => x.id === id);
        setErrors((prev) => [...prev, `${item?.name || id}: ${e.message}`]);
      }
      setProgress({ current: i + 1, total: selected.length });
    }
    setMsg({ type: 'success', text: `${updated} of ${selected.length} updated.` });
    config.refresh?.();
    setSaving(false);
  };

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
      <div style={{ marginBottom: 16 }}>
        <div className="crud-field-label">Select {entity}s to edit <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({selected.length} selected)</span></div>
        <div className="crud-checkbox-list">
          {items.map((i) => (
            <label key={i.id} className="crud-checkbox-row">
              <input type="checkbox" checked={selected.includes(i.id)} onChange={() => toggle(i.id)} disabled={saving} />
              {i.name}
            </label>
          ))}
        </div>
      </div>
      {selected.length > 0 && (
        <>
          <div className="crud-form-grid">
            {config.fields.map((f) => (
              <div key={f.key} className={f.full ? 'crud-form-full' : ''}>
                {renderField(f, values, setValues)}
              </div>
            ))}
          </div>
          <div className="crud-form-actions">
            <Button icon="check" onClick={submit} disabled={saving}>
              {saving ? `Updating... ${progress.current}/${progress.total}` : `Update Selected (${selected.length})`}
            </Button>
          </div>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk Delete                                                          */
/* ------------------------------------------------------------------ */
function BulkDelete({ config, entity }) {
  const { items, refresh } = useItems(config.logic);
  const [selected, setSelected] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState([]);

  const toggle = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const submit = async () => {
    setSaving(true); setMsg(null); setErrors([]);
    setProgress({ current: 0, total: selected.length });
    let deleted = 0;
    for (let i = 0; i < selected.length; i++) {
      const id = selected[i];
      try {
        const r = await config.logic.remove(id, config.actor);
        if (tryOk(r)) deleted++;
        else {
          const item = items.find((x) => x.id === id);
          setErrors((prev) => [...prev, `${item?.name || id}: ${tryErr(r)}`]);
        }
      } catch (e) {
        const item = items.find((x) => x.id === id);
        setErrors((prev) => [...prev, `${item?.name || id}: ${e.message}`]);
      }
      setProgress({ current: i + 1, total: selected.length });
    }
    setMsg({ type: 'success', text: `${deleted} of ${selected.length} deleted.` });
    if (!errors.length) { setSelected([]); setConfirming(false); }
    config.refresh?.(); refresh();
    setSaving(false);
  };

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
      <div style={{ marginBottom: 16 }}>
        <div className="crud-field-label">Select {entity}s to delete <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({selected.length} selected)</span></div>
        <div className="crud-checkbox-list">
          {items.map((i) => (
            <label key={i.id} className="crud-checkbox-row">
              <input type="checkbox" checked={selected.includes(i.id)} onChange={() => toggle(i.id)} disabled={saving} />
              {i.name}
            </label>
          ))}
        </div>
      </div>
      {selected.length > 0 && !confirming && (
        <div className="crud-form-actions">
          <Button variant="danger" icon="trash" onClick={() => setConfirming(true)} disabled={saving}>
            Delete Selected ({selected.length})
          </Button>
        </div>
      )}
      {confirming && (
        <div className="crud-confirm">
          <p>Delete {selected.length} {entity}(s)? This cannot be undone.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="danger" onClick={submit} disabled={saving}>{saving ? `Deleting... ${progress.current}/${progress.total}` : 'Yes, Delete All'}</Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={saving}>Cancel</Button>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Import                                                               */
/* ------------------------------------------------------------------ */
function BulkImport({ config, entity }) {
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
          const r = entity === 'Stage' ? await config.logic.add(obj.name) : await config.logic.create(obj, config.actor);
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
        <div className="crud-import-zone__sub">CSV columns: <code style={{ fontSize: 12 }}>{colNames}</code></div>
        <label style={{ cursor: 'pointer' }}>
          <input type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFile} disabled={saving} />
          <span className="btn btn--ghost">{file ? file.name : 'Choose CSV file'}</span>
        </label>
      </div>
      {preview.length > 0 && (
        <div style={{ marginBottom: 16 }}>
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

/* ------------------------------------------------------------------ */
/* Tip text per tab                                                     */
/* ------------------------------------------------------------------ */
const TIPS = {
  'single-add': (e) => `Use meaningful names${HAS_CODE.includes(e) ? ' and short codes' : ''} for better organization and quick identification.`,
  'single-edit': (e) => `Editing a ${e} name updates it across all associated records.`,
  'single-delete': (e) => `Ensure no active cases are using this ${e} before deleting.`,
  'bulk-add': (e) => HAS_CODE.includes(e) ? `Format: Name:CODE per line — e.g. "Civil Suit:CIV". Short codes should be uppercase.` : `Enter one ${e} name per line. Blank lines are ignored.`,
  'bulk-edit': (e) => `Select items then fill in the new values. Only filled fields will be updated.`,
  'bulk-delete': (e) => `Double-check your selection before confirming — deleted ${e}s cannot be recovered.`,
  'import': (e) => `CSV must have a header row. Supported columns match the ${e} fields shown above.`,
};

const SUBTITLES = {
  'single-add': (e) => `Add a new ${e} to your practice.`,
  'single-edit': (e) => `Edit an existing ${e}.`,
  'single-delete': (e) => `Remove a ${e} from your practice.`,
  'bulk-add': (e) => `Add multiple ${e}s at once.`,
  'bulk-edit': (e) => `Update multiple ${e}s in one operation.`,
  'bulk-delete': (e) => `Remove multiple ${e}s in one operation.`,
  'import': (e) => `Import ${e}s from a CSV file.`,
};

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */
export default function CrudManager({ open, onClose, entity, config }) {
  const [tab, setTab] = useState('single-add');

  useEffect(() => { if (open) setTab('single-add'); }, [open]);

  const subtitle = SUBTITLES[tab]?.(entity) ?? '';
  const tip = TIPS[tab]?.(entity) ?? '';

  return (
    <Modal
      open={open}
      title={`Manage ${entity}`}
      subtitle={subtitle}
      onClose={onClose}
      size="lg"
      className="crud-modal"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {/* Tab bar */}
      <div className="crud-tabs">
        {TABS.map((t, i) => {
          const prev = TABS[i - 1];
          const showDivider = prev && t.group !== prev.group;
          return (
            <React.Fragment key={t.id}>
              {showDivider && <div className="crud-tab-divider" />}
              <button
                type="button"
                className={[
                  'crud-tab',
                  t.danger ? 'crud-tab--danger' : '',
                  t.special === 'import' ? 'crud-tab--import' : '',
                  tab === t.id ? 'crud-tab--active' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setTab(t.id)}
              >
                <Icon name={t.icon} size={14} />
                {t.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Tab content */}
      <div key={`${entity}-${tab}`}>
        {tab === 'single-add' && <SingleAdd config={config} entity={entity} />}
        {tab === 'single-edit' && <SingleEdit config={config} entity={entity} />}
        {tab === 'single-delete' && <SingleDelete config={config} entity={entity} />}
        {tab === 'bulk-add' && <BulkAdd config={config} entity={entity} />}
        {tab === 'bulk-edit' && <BulkEdit config={config} entity={entity} />}
        {tab === 'bulk-delete' && <BulkDelete config={config} entity={entity} />}
        {tab === 'import' && <BulkImport config={config} entity={entity} />}
      </div>

      {/* Tip */}
      <TipBox text={tip} />
    </Modal>
  );
}
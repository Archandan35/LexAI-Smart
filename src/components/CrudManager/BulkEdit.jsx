import { useState } from 'react';
import Button from '@/components/Button.jsx';
import { renderField, Feedback, ProgressBar, useItems, tryOk, tryErr } from './utils.js';

export default function BulkEdit({ config, entity }) {
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
      <div className="crud-field-group">
        <div className="crud-field-label">Select {entity}s to edit <span className="crud-optional-label">({selected.length} selected)</span></div>
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

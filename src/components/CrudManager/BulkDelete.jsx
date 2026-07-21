import { useState } from 'react';
import Button from '@/components/Button.jsx';
import { Feedback, ProgressBar, useItems, tryOk, tryErr } from './utils.js';

export default function BulkDelete({ config, entity }) {
  const { items, refresh } = useItems(config.logic);
  const [selected, setSelected] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState([]);

  const toggle = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleAll = () => setSelected((p) => p.length === items.length ? [] : items.map((i) => i.id));

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
      <div className="crud-field-group">
        <div className="crud-field-label">Select {entity}s to delete <span className="crud-optional-label">({selected.length} selected)</span></div>
        <div className="crud-checkbox-toolbar">
          <label className="crud-checkbox-all">
            <input type="checkbox" checked={selected.length === items.length && items.length > 0} onChange={toggleAll} disabled={saving} />
            <span>Select all {items.length}</span>
          </label>
        </div>
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
          <div className="crud-confirm-actions">
            <Button variant="danger" onClick={submit} disabled={saving}>{saving ? `Deleting... ${progress.current}/${progress.total}` : 'Yes, Delete All'}</Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={saving}>Cancel</Button>
          </div>
        </div>
      )}
    </>
  );
}

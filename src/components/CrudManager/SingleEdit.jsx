import { useState } from 'react';
import Button from '@/components/Button.jsx';
import { Select } from '@/components/Field.jsx';
import { renderField, Feedback, useItems, tryOk, tryErr } from './utils.js';

export default function SingleEdit({ config, entity }) {
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
      <div className="crud-select-group">
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
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </>
      )}
    </>
  );
}

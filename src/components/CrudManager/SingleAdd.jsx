import { useState } from 'react';
import Button from '@/components/Button.jsx';
import { renderField, Feedback, tryOk, tryErr } from './utils.jsx';

export default function SingleAdd({ config, entity }) {
  const [values, setValues] = useState(() => {
    const v = { ...config.defaults };
    (config.fields || []).forEach((f) => {
      if (f.default !== undefined && v[f.key] === undefined) v[f.key] = f.default;
    });
    return v;
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async () => {
    setSaving(true); setMsg(null);
    try {
      const r = entity === 'Stage'
        ? await config.logic.add(values)
        : await config.logic.create(values, config.actor);
      if (tryOk(r)) {
        setMsg({ type: 'success', text: `${entity} added successfully.` });
        setValues({ ...config.defaults });
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

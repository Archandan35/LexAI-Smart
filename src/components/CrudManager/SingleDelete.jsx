import { useState } from 'react';
import Button from '@/components/Button.jsx';
import { Select } from '@/components/Field.jsx';
import { Feedback, useItems, tryOk, tryErr } from './utils.jsx';

export default function SingleDelete({ config, entity }) {
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
      <div className="crud-field-group">
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
          <div className="crud-confirm-actions">
            <Button variant="danger" onClick={submit} disabled={saving}>{saving ? 'Deleting...' : 'Yes, Delete'}</Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </>
  );
}

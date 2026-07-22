import { useState, useEffect } from 'react';
import Icon from '@/components/Icon.jsx';
import ColorPicker from '@/components/ColorPicker.jsx';
import { Input, Select } from '@/components/Field.jsx';
import PasswordInput from '@/components/PasswordInput.jsx';

export function tryOk(r) {
  if (!r) return false;
  return r.ok === true || r.ok === undefined || !!r.id;
}

export function tryErr(r) {
  if (!r) return 'Unknown error';
  return r.error || r.message || 'Operation failed';
}

export function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="crud-progress">
      <div className="crud-progress__bar">
        <div className="crud-progress__fill" style={{ '--fill': `${pct}%` }} />
      </div>
      <div className="crud-progress__text">{current} / {total} ({pct}%)</div>
    </div>
  );
}

export function useItems(logic) {
  const [items, setItems] = useState([]);
  const refresh = () =>
    logic.list().then((r) => setItems(Array.isArray(r) ? r : [])).catch(() => setItems([]));
  useEffect(() => { refresh(); }, [logic]);
  return { items, refresh };
}

export function Feedback({ msg }) {
  if (!msg) return null;
  return (
    <div className={`crud-toast${msg.type === 'error' ? ' crud-toast--error' : ''}`}>
      <Icon name={msg.type === 'error' ? 'alert' : 'check'} size={15} />
      {msg.text}
    </div>
  );
}

export function TipBox({ text }) {
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

export function renderField(f, values, setValues) {
  const val = values[f.key] ?? '';
  const set = (v) => setValues({ ...values, [f.key]: v });

  if (f.type === 'color') {
    const colorVal = val || f.default || '#6b7280';
    return (
      <div key={f.key} className="crud-field-group">
        <div className="crud-field-label">
          <span>{f.label}</span>
        </div>
        <ColorPicker value={colorVal} onChange={(c) => set(c)} />
        {f.hint && <div className="crud-field-hint">{f.hint}</div>}
      </div>
    );
  }

  if (f.key === 'status') {
    const active = val === 'Active' || val === '';
    return (
      <div key={f.key} className="crud-field-group">
        <div className="crud-field-label">
          <span>{f.label}</span><span className="req">*</span>
        </div>
        <div className="crud-status-select">
          <span className={`crud-status-dot${active ? ' is-active' : ''}`} />
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
    <div key={f.key} className="crud-field-group">
      <div className="crud-field-label">
        <span>{f.label}</span>
        {f.required !== false && <span className="req">*</span>}
        {f.optional && <span className="crud-optional-label">&nbsp;(Optional)</span>}
      </div>
      {isDesc ? (
        <div className="crud-input-icon crud-input-icon--top">
          <span className="crud-input-icon__ico"><Icon name="file" size={15} /></span>
          <textarea
            className="textarea crud-textarea-field"
            value={val}
            placeholder={f.placeholder || f.label}
            maxLength={charMax}
            onChange={(e) => set(e.target.value)}
          />
        </div>
      ) : f.type === 'password' ? (
        <PasswordInput value={val} placeholder={f.placeholder || f.label} onChange={(e) => set(e.target.value)} />
      ) : (
        <div className="crud-input-icon">
          <span className="crud-input-icon__ico">
            {f.key === 'short_code'
              ? <span className="crud-shortcode-label">Aa</span>
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
        <div className="crud-field-hint crud-hint-row">
          <span>Maximum {charMax} characters</span>
          <span>{val.length} / {charMax}</span>
        </div>
      )}
    </div>
  );
}

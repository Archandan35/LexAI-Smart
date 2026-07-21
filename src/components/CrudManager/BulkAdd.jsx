import { useState, useRef } from 'react';
import Button from '@/components/Button.jsx';
import { Textarea } from '@/components/Field.jsx';
import { Feedback, ProgressBar, tryOk, tryErr } from './utils.jsx';
import { BULK_SAMPLE_NAMES } from './constants.js';

export default function BulkAdd({ config, entity }) {
  const hasCode = (config.fields || []).some((f) => f.key === 'short_code');
  const scField = (config.fields || []).find((f) => f.key === 'short_code');
  const prefixMatch = scField?.placeholder?.match(/^([A-Za-z]+-)</);
  const prefix = prefixMatch ? prefixMatch[1] : '';
  const sampleNames = BULK_SAMPLE_NAMES[entity] || ['Item One', 'Item Two', 'Item Three'];
  const bulkPlaceholder = hasCode
    ? sampleNames.map((n) => `${n}: ${prefix}${n.toUpperCase().replace(/\s+/g, '-')}`).join('\n')
    : sampleNames.join('\n');
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
          const [name, codeRaw] = line.split(':').map((s) => s.trim());
          const code = (codeRaw || `${prefix}${name.toUpperCase().replace(/\s+/g, '-')}`).toUpperCase();
          r = await config.logic.create({ name: name || line, short_code: code, ...config.defaults }, config.actor);
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
      <div className="crud-bulk-label">
        <div className="crud-field-label">
          {hasCode ? 'Paste entries — Name:CODE per line' : 'Paste names — one per line'}
        </div>
        <Textarea
          value={lines}
          onChange={(e) => setLines(e.target.value)}
          rows={8}
          placeholder={bulkPlaceholder}
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

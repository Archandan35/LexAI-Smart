import React, { useState } from 'react';
import { Field, Input, Textarea, Select } from './Field.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import StageManager from './StageManager.jsx';
import { COURTS } from '@/constants/courts.js';
import { CASE_TAGS } from '@/constants/caseFolders.js';
import { useCaseStages } from '@/hooks/useCaseStages.js';

const blank = {
  caseNumber: '', title: '', court: COURTS[3], courtName: '', judge: '',
  stage: '', status: 'Active', plaintiff: '', defendant: '',
  advocate: '', client: '', filingDate: '', wsFilingDate: '', nextHearing: '',
  description: '', tags: [],
};

// CaseForm — shared create/edit form with Court Name, dynamic stages + manager.
export default function CaseForm({ initial, onSubmit, onCancel, busy, submitLabel = 'Save' }) {
  const { stages, names, refresh } = useCaseStages();
  const [stageMgr, setStageMgr] = useState(false);
  const [form, setForm] = useState(() => {
    const base = { ...blank, ...(initial || {}) };
    if (initial?.parties) { base.plaintiff = initial.parties.plaintiff || ''; base.defendant = initial.parties.defendant || ''; }
    if (Array.isArray(base.tags)) base.tags = base.tags.join(', ');
    return base;
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const tags = String(form.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
    onSubmit?.({ ...form, tags, parties: { plaintiff: form.plaintiff, defendant: form.defendant } });
  };

  return (
    <div>
      <div className="input-row">
        <Field label="Case Number"><Input value={form.caseNumber} onChange={(e) => set('caseNumber', e.target.value)} placeholder="O.S. No. __ of 20__" /></Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
            {['Active', 'Disposed', 'Stayed', 'Appeal'].map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Title / Cause Title"><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Plaintiff vs. Defendant" /></Field>

      <div className="input-row">
        <Field label="Plaintiff / Petitioner"><Input value={form.plaintiff} onChange={(e) => set('plaintiff', e.target.value)} /></Field>
        <Field label="Defendant / Respondent"><Input value={form.defendant} onChange={(e) => set('defendant', e.target.value)} /></Field>
      </div>

      <div className="input-row">
        <Field label="Court Type">
          <Select value={form.court} onChange={(e) => set('court', e.target.value)}>{COURTS.map((c) => <option key={c}>{c}</option>)}</Select>
        </Field>
        <Field label="Court Name" hint="e.g. Athgarh — shown as “Court Type, Court Name”.">
          <Input value={form.courtName} onChange={(e) => set('courtName', e.target.value)} placeholder="Athgarh" />
        </Field>
      </div>

      <div className="input-row">
        <Field label="Judge"><Input value={form.judge} onChange={(e) => set('judge', e.target.value)} placeholder="Presiding officer" /></Field>
        <Field label={<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>Case Stage</span>}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select value={form.stage} onChange={(e) => set('stage', e.target.value)}>
              <option value="">Select stage…</option>
              {names.map((s) => <option key={s}>{s}</option>)}
            </Select>
            <button type="button" className="btn btn--ghost btn--sm" title="Manage stages" onClick={() => setStageMgr(true)}><Icon name="gear" size={15} /></button>
          </div>
        </Field>
      </div>

      <div className="input-row">
        <Field label="Advocate"><Input value={form.advocate} onChange={(e) => set('advocate', e.target.value)} /></Field>
        <Field label="Client"><Input value={form.client} onChange={(e) => set('client', e.target.value)} /></Field>
      </div>

      <div className="input-row">
        <Field label="Filing Date"><Input type="date" value={form.filingDate} onChange={(e) => set('filingDate', e.target.value)} /></Field>
        <Field label="WS Filing Date"><Input type="date" value={form.wsFilingDate} onChange={(e) => set('wsFilingDate', e.target.value)} /></Field>
        <Field label="Next Hearing"><Input type="date" value={form.nextHearing} onChange={(e) => set('nextHearing', e.target.value)} /></Field>
      </div>

      <Field label="Tags" hint={`Comma-separated. Suggestions: ${CASE_TAGS.join(', ')}`}>
        <Input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="Urgent, Appeal" />
      </Field>
      <Field label="Description"><Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Brief description of the matter…" /></Field>

      <div className="modal__foot" style={{ padding: '8px 0 0', borderTop: 'none' }}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="primary" icon="save" loading={busy} onClick={submit}>{submitLabel}</Button>
      </div>

      <StageManager open={stageMgr} stages={stages} onClose={() => setStageMgr(false)} onChanged={refresh} />
    </div>
  );
}

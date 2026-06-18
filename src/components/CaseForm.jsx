import React, { useState, useMemo } from 'react';
import { Field, Input, Textarea, Select } from './Field.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import StageManager from './StageManager.jsx';
import { CASE_TAGS } from '@/constants/caseFolders.js';
import { useCaseStages } from '@/hooks/useCaseStages.js';
import { useCaseTypes } from '@/hooks/useCaseTypes.js';
import { useCourts } from '@/hooks/useCourts.js';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: currentYear - 1949 + 1 }, (_, i) => String(1949 + i));

function blank() {
  return {
    id: '', caseNumber: '', title: '', case_type: '', case_number: '', case_year: String(currentYear),
    case_display_number: '', plaintiff: '', defendant: '',
    court: '', courtName: '', judge: '',
    stage: '', status: 'Active', advocate: '', client: '',
    filingDate: '', wsFilingDate: '', nextHearing: '',
    description: '', tags: [],
  };
}

export default function CaseForm({ initial, onSubmit, onCancel, busy, submitLabel = 'Save' }) {
  const { stages, names, refresh } = useCaseStages();
  const { caseTypes } = useCaseTypes();
  const { courtNames } = useCourts();
  const [stageMgr, setStageMgr] = useState(false);
  const [form, setForm] = useState(() => {
    const base = { ...blank(), ...(initial || {}) };
    if (initial?.parties) {
      if (!base.plaintiff) base.plaintiff = initial.parties.plaintiff || '';
      if (!base.defendant) base.defendant = initial.parties.defendant || '';
    }
    if (Array.isArray(base.tags)) base.tags = base.tags.join(', ');
    if (!base.case_year && base.caseNumber) {
      const parts = base.caseNumber.match(/No\.\s*(\d+)\s*of\s*(\d{4})/i);
      if (parts) {
        base.case_number = Number(parts[1]);
        base.case_year = parts[2];
      }
    }
    return base;
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const caseTypeNames = useMemo(() => caseTypes.filter((t) => t.status !== 'Inactive').map((t) => t.short_code), [caseTypes]);

  const displayNumber = useMemo(() => {
    const ct = form.case_type || '';
    const cn = form.case_number || '';
    const cy = form.case_year || '';
    return ct && cn && cy ? `${ct} No. ${cn} of ${cy}` : '';
  }, [form.case_type, form.case_number, form.case_year]);

  const autoTitle = useMemo(() => {
    const p = form.plaintiff?.trim();
    const d = form.defendant?.trim();
    return p || d ? [p, d].filter(Boolean).join(' vs ') : '';
  }, [form.plaintiff, form.defendant]);

  const submit = () => {
    const tags = String(form.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
    const payload = {
      ...form,
      case_number: form.case_number ? Number(form.case_number) : undefined,
      case_display_number: displayNumber,
      caseNumber: displayNumber || form.caseNumber,
      title: autoTitle || form.title,
      tags,
      parties: { plaintiff: form.plaintiff, defendant: form.defendant },
    };
    onSubmit?.(payload);
  };

  return (
    <div>
      <div className="input-row">
        <Field label="Case Type">
          <Select value={form.case_type} onChange={(e) => set('case_type', e.target.value)}>
            <option value="">Select case type…</option>
            {caseTypeNames.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Case Number">
          <Input type="number" min="1" value={form.case_number} onChange={(e) => set('case_number', e.target.value)} placeholder="42" />
        </Field>
        <Field label="Year">
          <Select value={form.case_year} onChange={(e) => set('case_year', e.target.value)}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </Field>
      </div>

      {displayNumber && (
        <div className="field">
          <span className="field__hint" style={{ fontSize: 13, fontWeight: 600, paddingLeft: 2 }}>
            Display: <code>{displayNumber}</code>
          </span>
        </div>
      )}

      <Field label="Title / Cause Title">
        <Input value={autoTitle || form.title} onChange={(e) => set('title', e.target.value)} placeholder="Auto-generated from parties" readOnly={!!autoTitle} />
      </Field>

      <div className="input-row">
        <Field label="Plaintiff / Petitioner"><Input value={form.plaintiff} onChange={(e) => set('plaintiff', e.target.value)} /></Field>
        <Field label="Defendant / Respondent"><Input value={form.defendant} onChange={(e) => set('defendant', e.target.value)} /></Field>
      </div>

      <div className="input-row">
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
            {['Active', 'Disposed', 'Stayed', 'Appeal'].map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Court Type">
          <Select value={form.court} onChange={(e) => set('court', e.target.value)}>
            <option value="">Select court…</option>
            {courtNames.map((c) => <option key={c}>{c}</option>)}
          </Select>
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

import React, { useState, useMemo, useEffect } from 'react';
import { Field, Input, Textarea, Select } from './Field.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import StageManager from './StageManager.jsx';
import CaseTypeManager from './CaseTypeManager.jsx';
import { useCaseTypes } from '@/hooks/useCaseTypes.js';
import { useCaseStages } from '@/hooks/useCaseStages.js';
import { useCourtHierarchy } from '@/hooks/useCourtHierarchy.js';
import { useBenchTypes } from '@/hooks/useBenchTypes.js';
import { usePriorities } from '@/hooks/usePriorities.js';

const currentYear = new Date().getFullYear();

/* ---- Same INITIAL_FORM as CreateCase ---- */
function blank() {
  return {
    case_number: '', case_year: String(currentYear), case_type: '',
    plaintiff: '', defendant: '', client: '', advocate: '',
    court_hierarchy: '', court_name: '', bench_type: '', judge: '',
    stage: '', priority: '',
    filing_date: '', next_hearing: '',
    filing_number: '', registration_number: '', cnr_number: '',
    registration_date: '', disposal_date: '',
    case_summary: '', internal_notes: '', document_folder: '',
  };
}

/* ---- Same SectionCard as CreateCase ---- */
function SectionCard({ num, title, children }) {
  return (
    <div className="cc-section">
      <div className="cc-section__head">
        <span className="cc-section__num">{num}</span>
        <span className="cc-section__title">{title}</span>
      </div>
      <div className="cc-section__body">{children}</div>
    </div>
  );
}

export default function CaseForm({ initial, onSubmit, onCancel, busy, submitLabel = 'Update Case' }) {
  const { caseTypes, refresh: refreshCaseTypes } = useCaseTypes();
  const { stages, names: stageNames, refresh: refreshStages } = useCaseStages();
  const { hierarchy } = useCourtHierarchy();
  const { benchTypes } = useBenchTypes();
  const { priorities } = usePriorities();

  const [stageMgr, setStageMgr] = useState(false);
  const [caseTypeMgr, setCaseTypeMgr] = useState(false);

  const [form, setForm] = useState(() => {
    const base = { ...blank(), ...(initial || {}) };
    if (initial?.filingDate && !base.filing_date) base.filing_date = initial.filingDate;
    if (initial?.nextHearing && !base.next_hearing) base.next_hearing = initial.nextHearing;
    if (initial?.wsFilingDate && !base.ws_filing_date) base.ws_filing_date = initial.wsFilingDate;
    if (initial?.judge && !base.judge) base.judge = initial.judge;
    if (initial?.presiding_officer && !base.judge) base.judge = initial.presiding_officer;
    if (!base.court_name && initial?.court) base.court_name = initial.court;
    return base;
  });

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const caseTypeOptions = useMemo(() =>
    caseTypes.filter((t) => t.status !== 'Inactive').map((t) => ({ value: t.short_code || t.name, label: t.name }))
  , [caseTypes]);

  const hierarchyOptions = hierarchy.map((h) => ({ value: h, label: h }));
  const benchTypeOptions = benchTypes.map((b) => ({ value: b, label: b }));
  const priorityOptions = priorities.map((p) => ({ value: p, label: p }));
  const stageOptions = stageNames.map((s) => ({ value: s, label: s }));

  const autoCourtName = useMemo(() => {
    const h = hierarchyOptions.find((o) => o.value === form.court_hierarchy);
    return h ? h.label : form.court_name || '';
  }, [form.court_hierarchy, form.court_name, hierarchyOptions]);

  useEffect(() => {
    if (form.court_hierarchy && autoCourtName) {
      setField('court_name', autoCourtName);
    }
  }, [autoCourtName, form.court_hierarchy]);

  const submit = () => {
    const payload = { ...form };
    if (payload.case_number) payload.case_number = String(payload.case_number);
    if (payload.case_year) payload.case_year = String(payload.case_year);
    if (!payload.court_name && autoCourtName) payload.court_name = autoCourtName;
    onSubmit?.(payload);
  };

  const sel = (label, value, options, onChange, placeholder) => {
    const hasValue = value && !options.some((o) => o.value === value);
    const all = hasValue ? [{ value, label: value }, ...options] : options;
    return (
      <div className="select-with-add">
        <select
          className="select"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1 }}
        >
          <option value="">{placeholder || `Select ${label.toLowerCase()}…`}</option>
          {all.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div>
      {/* ── 1. Case Header ── */}
      <SectionCard num="1" title="Case Header">
        <div className="grid-3">
          <Field label="Case Number">
            <Input value={form.case_number} onChange={(e) => setField('case_number', e.target.value)} placeholder="e.g., 123/2024" />
          </Field>
          <Field label="Case Year">
            <Input value={form.case_year} onChange={(e) => setField('case_year', e.target.value)} placeholder="e.g., 2024" />
          </Field>
          <Field label="Case Type">
            <div style={{ display: 'flex', gap: 8 }}>
              {sel('Case Type', form.case_type, caseTypeOptions, (v) => setField('case_type', v), 'Select case type')}
              <button type="button" className="btn btn--ghost btn--sm" title="Manage case types" onClick={() => setCaseTypeMgr(true)}><Icon name="gear" size={15} /></button>
            </div>
          </Field>
          <Field label="Case Stage">
            <div style={{ display: 'flex', gap: 8 }}>
              {sel('Stage', form.stage, stageOptions, (v) => setField('stage', v), 'Select stage')}
              <button type="button" className="btn btn--ghost btn--sm" title="Manage stages" onClick={() => setStageMgr(true)}><Icon name="gear" size={15} /></button>
            </div>
          </Field>
        </div>
      </SectionCard>

      {/* ── 2. Parties ── */}
      <SectionCard num="2" title="Parties">
        <div className="grid-2">
          <Field label="Plaintiff / Petitioner">
            <Input value={form.plaintiff} onChange={(e) => setField('plaintiff', e.target.value)} placeholder="Plaintiff name(s)" />
          </Field>
          <Field label="Defendant / Respondent">
            <Input value={form.defendant} onChange={(e) => setField('defendant', e.target.value)} placeholder="Defendant name(s)" />
          </Field>
          <Field label="Client">
            <Input value={form.client} onChange={(e) => setField('client', e.target.value)} placeholder="Client name" />
          </Field>
          <Field label="Advocate">
            <Input value={form.advocate} onChange={(e) => setField('advocate', e.target.value)} placeholder="Advocate name" />
          </Field>
        </div>
      </SectionCard>

      {/* ── 3. Court Information ── */}
      <SectionCard num="3" title="Court Information">
        <div className="grid-3">
          <Field label="Court Hierarchy">
            {sel('Court Hierarchy', form.court_hierarchy, hierarchyOptions, (v) => setField('court_hierarchy', v), 'Select hierarchy')}
          </Field>
          <Field label="Bench Type">
            {sel('Bench Type', form.bench_type, benchTypeOptions, (v) => setField('bench_type', v), 'Select bench type')}
          </Field>
          <Field label="Presiding Officer">
            <Input value={form.judge} onChange={(e) => setField('judge', e.target.value)} placeholder="Judge name" />
          </Field>
        </div>
        <Field label="Court Name">
          <Input value={form.court_name || autoCourtName} onChange={(e) => setField('court_name', e.target.value)} placeholder="Auto-computed from hierarchy" readOnly={!!form.court_hierarchy} />
        </Field>
      </SectionCard>

      {/* ── 4. Case Tracking ── */}
      <SectionCard num="4" title="Case Tracking">
        <div className="grid-3">
          <Field label="Priority">
            {sel('Priority', form.priority, priorityOptions, (v) => setField('priority', v), 'Select priority')}
          </Field>
          <Field label="Filing Date">
            <Input type="date" value={form.filing_date} onChange={(e) => setField('filing_date', e.target.value)} />
          </Field>
          <Field label="Next Hearing Date">
            <Input type="date" value={form.next_hearing} onChange={(e) => setField('next_hearing', e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      {/* ── 5. Identifiers ── */}
      <SectionCard num="5" title="Identifiers">
        <div className="grid-3">
          <Field label="Filing Number">
            <Input value={form.filing_number} onChange={(e) => setField('filing_number', e.target.value)} placeholder="e.g., 8555515" />
          </Field>
          <Field label="Registration Number">
            <Input value={form.registration_number} onChange={(e) => setField('registration_number', e.target.value)} placeholder="e.g., 6606265602" />
          </Field>
          <Field label="CNR Number">
            <Input value={form.cnr_number} onChange={(e) => setField('cnr_number', e.target.value)} placeholder="e.g., 656026262662" />
          </Field>
          <Field label="Registration Date">
            <Input type="date" value={form.registration_date} onChange={(e) => setField('registration_date', e.target.value)} />
          </Field>
          <Field label="Disposal Date">
            <Input type="date" value={form.disposal_date} onChange={(e) => setField('disposal_date', e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      {/* ── 6. Description ── */}
      <SectionCard num="6" title="Description">
        <Field label="Case Summary">
          <Textarea value={form.case_summary} onChange={(e) => setField('case_summary', e.target.value)} placeholder="Brief description of the matter..." rows={3} />
        </Field>
        <Field label="Internal Notes">
          <Textarea value={form.internal_notes} onChange={(e) => setField('internal_notes', e.target.value)} placeholder="Internal notes..." rows={3} />
        </Field>
      </SectionCard>

      {/* ── 7. Documents ── */}
      <SectionCard num="7" title="Documents">
        <Field label="Document Folder">
          <Input value={form.document_folder} onChange={(e) => setField('document_folder', e.target.value)} placeholder="e.g., Suit Copy" />
        </Field>
      </SectionCard>

      <div className="modal__foot" style={{ padding: '8px 0 0', borderTop: 'none' }}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="primary" icon="save" loading={busy} onClick={submit}>{submitLabel}</Button>
      </div>

      <StageManager open={stageMgr} stages={stages} onClose={() => setStageMgr(false)} onChanged={refreshStages} />
      <CaseTypeManager open={caseTypeMgr} caseTypes={caseTypes} onClose={() => setCaseTypeMgr(false)} onChanged={refreshCaseTypes} />
    </div>
  );
}

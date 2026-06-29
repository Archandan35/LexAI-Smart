import { useState, useEffect, useMemo } from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import StageManager from './StageManager.jsx';
import CaseTypeManager from './CaseTypeManager.jsx';
import CrudManager from './CrudManager.jsx';
import Field, { Input, Textarea } from './Field.jsx';
import SearchableSelect from './SearchableSelect.jsx';
import { useCaseTypes } from '@/hooks/useCaseTypes.js';
import { useCaseStages } from '@/hooks/useCaseStages.js';
import { useCourts } from '@/hooks/useCourts.js';
import { useBenchTypes } from '@/hooks/useBenchTypes.js';
import { usePriorities } from '@/hooks/usePriorities.js';
import { useJurisdictions } from '@/hooks/useJurisdictions.js';
import { useJudges } from '@/hooks/useJudges.js';
import { jurisdictionLogic } from '@/logic/jurisdictionLogic.js';
import { clientLogic } from '@/logic/clientLogic.js';
import { userLogic } from '@/logic/userLogic.js';
import { judgeLogic } from '@/logic/judgeLogic.js';
import { extractJurisdiction } from '@/utils/caseFormat.js';

const currentYear = new Date().getFullYear();

/* ---- Same INITIAL_FORM as CreateCase ---- */
function blank() {
  return {
    case_number: '', case_year: String(currentYear), case_type: '',
    plaintiff: '', defendant: '', client: '', advocate: '',
    court: '', court_name: '', jurisdiction: '', bench_type: '', judge: '',
    stage: '', priority: '',
    filing_date: '', next_hearing: '',
    filing_number: '', registration_number: '', cnr_number: '',
    registration_date: '', disposal_date: '',
    case_summary: '', internal_notes: '', document_folder: '',
  };
}

function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
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

export default function CaseForm({ initial, onSubmit, onCancel, busy, submitLabel = 'Update Case', caseDocuments }) {
  const { caseTypes, refresh: refreshCaseTypes } = useCaseTypes();
  const { stages, names: stageNames, refresh: refreshStages } = useCaseStages();
  const { courts } = useCourts();
  const { benchTypes } = useBenchTypes();
  const { priorities } = usePriorities();

  const { jurisdictions, refresh: refreshJurisdictions } = useJurisdictions();
  const { judges, refresh: refreshJudges } = useJudges();
  const [stageMgr, setStageMgr] = useState(false);
  const [caseTypeMgr, setCaseTypeMgr] = useState(false);
  const [jurisdictionMgr, setJurisdictionMgr] = useState(false);
  const [clientMgr, setClientMgr] = useState(false);
  const [advocateMgr, setAdvocateMgr] = useState(false);
  const [judgeMgr, setJudgeMgr] = useState(false);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    clientLogic.list().then((r) => { setClients(Array.isArray(r) ? r : []); }).catch(() => {});
    userLogic.list().then((r) => { setUsers(Array.isArray(r) ? r : []); }).catch(() => {});
  }, []);

  const [form, setForm] = useState(() => {
    const base = { ...blank(), ...(initial || {}) };
    if (initial?.filingDate && !base.filing_date) base.filing_date = initial.filingDate;
    if (initial?.nextHearing && !base.next_hearing) base.next_hearing = initial.nextHearing;
    if (initial?.wsFilingDate && !base.ws_filing_date) base.ws_filing_date = initial.wsFilingDate;
    if (initial?.judge && !base.judge) base.judge = initial.judge;
    if (initial?.presiding_officer && !base.judge) base.judge = initial.presiding_officer;
    if (!base.court_name && initial?.court) base.court_name = initial.court;
    if (!base.jurisdiction) {
      const extracted = extractJurisdiction(initial);
      if (extracted) base.jurisdiction = extracted;
    }
    ['next_hearing', 'filing_date', 'registration_date', 'disposal_date', 'ws_filing_date'].forEach((k) => {
      if (base[k]) base[k] = toDateInput(base[k]);
    });
    return base;
  });

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const caseTypeOptions = useMemo(() =>
    caseTypes.filter((t) => t.status !== 'Inactive').map((t) => ({ value: t.short_code || t.name, label: t.name }))
  , [caseTypes]);

  const hierarchyOptions = courts.map((h) => ({ value: h, label: h }));
  const benchTypeOptions = benchTypes.map((b) => ({ value: b, label: b }));
  const priorityOptions = priorities.map((p) => ({ value: p.name || p, label: p.name || p }));
  const stageOptions = stageNames.map((s) => ({ value: s, label: s }));
  const jurisdictionOptions = jurisdictions.map((j) => ({ value: j, label: j }));
  const clientOptions = clients.map((c) => ({ value: c.name, label: c.name }));
  const userOptions = users.map((u) => ({ value: u.name, label: u.name }));
  const judgeOptions = judges.map((j) => ({ value: j, label: j }));

  const autoCourtName = useMemo(() => {
    const h = hierarchyOptions.find((o) => o.value === form.court);
    const j = form.jurisdiction;
    if (h && j) return `${h.label}, ${j}`;
    if (h) return h.label;
    if (j) return j;
    return form.court_name || '';
  }, [form.court, form.jurisdiction, form.court_name, hierarchyOptions]);

  const submit = () => {
    const payload = { ...form };
    if (payload.case_number) payload.case_number = String(payload.case_number);
    if (payload.case_year) payload.case_year = String(payload.case_year);
    payload.court_name = autoCourtName;
    delete payload.jurisdiction;
    ['next_hearing', 'disposal_date', 'filing_date', 'registration_date', 'ws_filing_date'].forEach((k) => {
      if (!payload[k]) delete payload[k];
    });
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
            <div style={{ display: 'flex', gap: 8 }}>
              <SearchableSelect value={form.client} onChange={(e) => setField('client', e.target.value)} options={clientOptions} placeholder="Select client" />
              <button type="button" className="btn btn--ghost btn--sm" title="Manage clients" onClick={() => setClientMgr(true)}><Icon name="gear" size={15} /></button>
            </div>
          </Field>
          <Field label="Advocate">
            <div style={{ display: 'flex', gap: 8 }}>
              <SearchableSelect value={form.advocate} onChange={(e) => setField('advocate', e.target.value)} options={userOptions} placeholder="Select advocate" />
              <button type="button" className="btn btn--ghost btn--sm" title="Manage advocates" onClick={() => setAdvocateMgr(true)}><Icon name="gear" size={15} /></button>
            </div>
          </Field>
        </div>
      </SectionCard>

      {/* ── 3. Court Information ── */}
      <SectionCard num="3" title="Court Information">
        <div className="grid-3">
          <Field label="Courts">
            {sel('Courts', form.court, hierarchyOptions, (v) => setField('court', v), 'Select court')}
          </Field>
          <Field label="Jurisdiction">
            <div style={{ display: 'flex', gap: 8 }}>
              {sel('Jurisdiction', form.jurisdiction, jurisdictionOptions, (v) => setField('jurisdiction', v), 'Select jurisdiction')}
              <button type="button" className="btn btn--ghost btn--sm" title="Manage jurisdictions" onClick={() => setJurisdictionMgr(true)}><Icon name="gear" size={15} /></button>
            </div>
          </Field>
          <Field label="Bench Type">
            {sel('Bench Type', form.bench_type, benchTypeOptions, (v) => setField('bench_type', v), 'Select bench type')}
          </Field>
          <Field label="Judge">
            <div style={{ display: 'flex', gap: 8 }}>
              <SearchableSelect value={form.judge} onChange={(e) => setField('judge', e.target.value)} options={judgeOptions} placeholder="Select judge" />
              <button type="button" className="btn btn--ghost btn--sm" title="Manage judges" onClick={() => setJudgeMgr(true)}><Icon name="gear" size={15} /></button>
            </div>
          </Field>
          <Field label="Court Name">
            <Input value={form.court_name || autoCourtName} onChange={(e) => setField('court_name', e.target.value)} placeholder="Enter court location" />
          </Field>
        </div>
      </SectionCard>

      {/* ── 4. Case Tracking ── */}
      <SectionCard num="4" title="Case Tracking">
        <div className="grid-3">
          <Field label="Priority">
            {sel('Priority', form.priority, priorityOptions, (v) => setField('priority', v), 'Select priority')}
          </Field>
          <Field label="Filing Date">
            <Input type="date" placeholder="dd-mm-yyyy" value={form.filing_date} onChange={(e) => setField('filing_date', e.target.value)} />
          </Field>
          <Field label="Next Hearing Date">
            <Input type="date" placeholder="dd-mm-yyyy" value={form.next_hearing} onChange={(e) => setField('next_hearing', e.target.value)} />
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
            <Input type="date" placeholder="dd-mm-yyyy" value={form.registration_date} onChange={(e) => setField('registration_date', e.target.value)} />
          </Field>
          <Field label="Disposal Date">
            <Input type="date" placeholder="dd-mm-yyyy" value={form.disposal_date} onChange={(e) => setField('disposal_date', e.target.value)} />
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
        {caseDocuments && caseDocuments.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <label className="field__label">Attached Files</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
              {caseDocuments.map((d) => (
                <div key={d.id} className="list-row" style={{ borderRadius: 8, border: '1px solid var(--border)', padding: '8px 12px', background: 'var(--surface-2)' }}>
                  <div className="list-row__icon"><Icon name="file" size={15} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="list-row__title">{d.name}</div>
                    <div className="list-row__meta">{d.folder || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <div className="modal__foot" style={{ padding: '8px 0 0', borderTop: 'none' }}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="primary" icon="save" loading={busy} onClick={submit}>{submitLabel}</Button>
      </div>

      <StageManager open={stageMgr} stages={stages} onClose={() => setStageMgr(false)} onChanged={refreshStages} />
      <CaseTypeManager open={caseTypeMgr} caseTypes={caseTypes} onClose={() => setCaseTypeMgr(false)} onChanged={refreshCaseTypes} />
      <CrudManager open={jurisdictionMgr} onClose={() => { setJurisdictionMgr(false); refreshJurisdictions(); }} entity="Jurisdiction" config={{ logic: jurisdictionLogic, fields: [{ key: 'name', label: 'Jurisdiction Name', placeholder: 'Enter jurisdiction name' }], defaults: {}, refresh: refreshJurisdictions }} />
      <CrudManager open={clientMgr} onClose={() => { setClientMgr(false); clientLogic.list().then((r) => { setClients(Array.isArray(r) ? r : []); }).catch(() => {}); }} entity="Client" config={{ logic: clientLogic, fields: [
        { key: 'name', label: 'Client Name', placeholder: 'Enter client name' },
        { key: 'phone', label: 'Phone', placeholder: 'e.g., +91 9876543210' },
        { key: 'email', label: 'Email', placeholder: 'email@example.com' },
        { key: 'address', label: 'Address', placeholder: 'Enter address' },
        { key: 'client_type', label: 'Type', placeholder: 'e.g., Individual, Firm', default: 'Individual' },
      ], defaults: {}, refresh: () => clientLogic.list().then((r) => { setClients(Array.isArray(r) ? r : []); }).catch(() => {}) }} />
      <CrudManager open={advocateMgr} onClose={() => { setAdvocateMgr(false); userLogic.list().then((r) => { setUsers(Array.isArray(r) ? r : []); }).catch(() => {}); }} entity="Advocate" config={{ logic: userLogic, fields: [
        { key: 'name', label: 'Name', placeholder: 'Enter advocate name' },
        { key: 'email', label: 'Email', placeholder: 'email@example.com' },
        { key: 'phone', label: 'Phone', placeholder: 'e.g., +91 9876543210' },
        { key: 'address', label: 'Address', placeholder: 'Enter address' },
        { key: 'password', label: 'Password', type: 'password', placeholder: 'Set password' },
      ], defaults: {}, refresh: () => userLogic.list().then((r) => { setUsers(Array.isArray(r) ? r : []); }).catch(() => {}) }} />
      <CrudManager open={judgeMgr} onClose={() => { setJudgeMgr(false); refreshJudges(); }} entity="Judge" config={{ logic: judgeLogic, fields: [
        { key: 'name', label: 'Judge Name', placeholder: 'e.g., Justice Sharma' },
        { key: 'short_code', label: 'Short Code', placeholder: 'e.g., JS' },
        { key: 'designation', label: 'Designation', placeholder: 'e.g., District & Sessions Judge' },
      ], defaults: {}, refresh: refreshJudges }} />
    </div>
  );
}


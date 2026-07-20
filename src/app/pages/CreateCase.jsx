import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Field, { Input, Textarea } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import CrudManager from '@/components/CrudManager.jsx';
import SearchableSelect from '@/components/SearchableSelect.jsx';
import { caseLogic } from '@/logic/caseLogic.js';
import { clientLogic } from '@/logic/clientLogic.js';
import { userLogic } from '@/logic/userLogic.js';
import { caseStatusLogic } from '@/logic/caseStatusLogic.js';
import { caseTypeLogic } from '@/logic/caseTypeLogic.js';
import { courtsLogic } from '@/logic/courtsLogic.js';
import { benchTypeLogic } from '@/logic/benchTypeLogic.js';
import { jurisdictionLogic } from '@/logic/jurisdictionLogic.js';
import { caseStageLogic } from '@/logic/caseStageLogic.js';
import { priorityLogic } from '@/logic/priorityLogic.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useCaseTypes } from '@/hooks/useCaseTypes.js';
import { useCaseStages } from '@/hooks/useCaseStages.js';
import { usePriorities } from '@/hooks/usePriorities.js';
import { useCourts } from '@/hooks/useCourts.js';
import { useBenchTypes } from '@/hooks/useBenchTypes.js';
import { useJurisdictions } from '@/hooks/useJurisdictions.js';
import { useJudges } from '@/hooks/useJudges.js';
import { judgeLogic } from '@/logic/judgeLogic.js';
import { caseFolderLogic } from '@/logic/caseFolderLogic.js';
import Button from '@/components/Button.jsx';
import DateInput from '@/components/DateInput.jsx';

const INITIAL_FORM = {
  case_number: '', case_year: '', case_type: '',
  plaintiffs: [], defendants: [],
  client: '', advocate: '',
  court: '', court_name: '', bench_type: '',
  presiding_officer: '', jurisdiction: '',
  stage: '', priority: '',
  filing_date: '', next_hearing_date: '',
  filing_number: '', registration_number: '', cnr_number: '',
  registration_date: '', disposal_date: '',
  case_summary: '', internal_notes: '', document_folder: '',
};

/* ---- Sub-components ---- */
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

function GearSelect({ value, onChange, options, placeholder, entity, onGearClick }) {
  return (
    <div className="select-with-add">
      <SearchableSelect value={value} onChange={onChange} options={options} placeholder={placeholder} />
      <button
        type="button"
        className="icon-btn cc__gear-btn"
        title={`Manage ${entity}`}
        onClick={() => onGearClick(entity)}
      >
        <Icon name="gear" size={16} />
      </button>
    </div>
  );
}

function PartyColumn({ label, items, inputValue, onInputChange, onAdd, onRemove, placeholder }) {
  return (
    <div className="cc-party-col">
      <div className="cc-party-col__head">
        <span className="cc-party-col__label">{label} <span className="text-red">*</span></span>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onAdd}
          disabled={!inputValue.trim()}
        >
          <Icon name="plus" size={13} /> Add
        </button>
      </div>
      <Input
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
      />
      {items.length > 0 ? (
        <div className="multi-value-container mt-10">
          {items.map((item, i) => (
            <span key={i} className="multi-value-item">
              {item}
              <button type="button" className="icon-btn cc__remove-btn" onClick={() => onRemove(i)} aria-label={`Remove ${item}`}>
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="cc-party-empty">
          <Icon name="users" size={22} />
          No parties added yet
        </div>
      )}
    </div>
  );
}

const ENTITY_CONFIGS = {
  Status: { label: 'Status', logic: caseStatusLogic, fields: [
    { key: 'name', label: 'Status Name', placeholder: 'Enter status name' },
    { key: 'short_code', label: 'Short Code', placeholder: 'CASS-PENDING', hint: 'Example: CASS-PENDING' },
    { key: 'status', label: 'Status', default: 'Active', entityLabel: 'status' },
    { key: 'color', label: 'Color', type: 'color', default: '#6b7280' },
  ], defaults: { status: 'Active' } },
  'Case Type': { label: 'Case Type', logic: caseTypeLogic, fields: [{ key: 'name', label: 'Case Type Name', placeholder: 'e.g., Civil' }, { key: 'short_code', label: 'Short Code', placeholder: 'CAST-CIVIL-SUIT-I', hint: 'Example: CAST-CIVIL-SUIT-I' }, { key: 'status', label: 'Status', default: 'Active', entityLabel: 'status' }, { key: 'color', label: 'Color', type: 'color', default: '#6b7280' }], defaults: { status: 'Active' } },
  Courts: { label: 'Courts', logic: courtsLogic, fields: [{ key: 'name', label: 'Court Name', placeholder: 'e.g., Supreme Court' }, { key: 'short_code', label: 'Short Code', placeholder: 'COUT-HIGH-COURT', hint: 'Example: COUT-HIGH-COURT' }, { key: 'status', label: 'Status', default: 'Active', entityLabel: 'status' }, { key: 'color', label: 'Color', type: 'color', default: '#6b7280' }], defaults: { status: 'Active' } },
  'Bench Type': { label: 'Bench Type', logic: benchTypeLogic, fields: [{ key: 'name', label: 'Bench Type Name', placeholder: 'e.g., Single Bench' }, { key: 'short_code', label: 'Short Code', placeholder: 'BENT-DIVISION-BENCH', hint: 'Example: BENT-DIVISION-BENCH' }, { key: 'status', label: 'Status', default: 'Active', entityLabel: 'status' }, { key: 'color', label: 'Color', type: 'color', default: '#6b7280' }], defaults: { status: 'Active' } },
  Jurisdiction: { label: 'Jurisdiction', logic: jurisdictionLogic, fields: [{ key: 'name', label: 'Jurisdiction Name', placeholder: 'e.g., Delhi' }, { key: 'short_code', label: 'Short Code', placeholder: 'JURT-CIVIL', hint: 'Example: JURT-CIVIL' }, { key: 'status', label: 'Status', default: 'Active', entityLabel: 'status' }, { key: 'color', label: 'Color', type: 'color', default: '#6b7280' }], defaults: { status: 'Active' } },
  Stage: { label: 'Stage', logic: caseStageLogic, fields: [{ key: 'name', label: 'Stage Name', placeholder: 'e.g., Pleading' }, { key: 'short_code', label: 'Short Code', placeholder: 'CSTT-TRIAL', hint: 'Example: CSTT-TRIAL' }, { key: 'status', label: 'Status', default: 'Active', entityLabel: 'status' }, { key: 'color', label: 'Color', type: 'color', default: '#6b7280' }], defaults: { status: 'Active' } },
  Priority: { label: 'Priority', logic: priorityLogic, fields: [{ key: 'name', label: 'Priority Name', placeholder: 'e.g., High' }, { key: 'short_code', label: 'Short Code', placeholder: 'PRIT-HIGH', hint: 'Example: PRIT-HIGH' }, { key: 'status', label: 'Status', default: 'Active', entityLabel: 'status' }, { key: 'color', label: 'Color', type: 'color', default: '#6b7280' }], defaults: { status: 'Active' } },
  Client: { label: 'Client', logic: clientLogic, fields: [{ key: 'name', label: 'Client Name', placeholder: 'Enter client name', required: false }, { key: 'phone', label: 'Phone', placeholder: 'e.g., +91 9876543210', required: false }, { key: 'email', label: 'Email', placeholder: 'email@example.com', required: false }, { key: 'address', label: 'Address', placeholder: 'Enter address', required: false }, { key: 'client_type', label: 'Type', placeholder: 'e.g., Individual, Firm', default: 'Individual', required: false }], defaults: {} },
  Advocate: { label: 'Advocate', logic: userLogic, fields: [{ key: 'name', label: 'Name', placeholder: 'Enter advocate name', required: false }, { key: 'email', label: 'Email', placeholder: 'email@example.com', required: false }, { key: 'phone', label: 'Phone', placeholder: 'e.g., +91 9876543210', required: false }, { key: 'address', label: 'Address', placeholder: 'Enter address', required: false }], defaults: { roleCode: 'advocate', password: crypto.randomUUID() } },
  Judge: { label: 'Judge', logic: judgeLogic, fields: [{ key: 'name', label: 'Judge Name', placeholder: 'e.g., Justice Sharma' }, { key: 'short_code', label: 'Short Code', placeholder: 'JUDG-SK-MOHAPATRA', hint: 'Example: JUDG-SK-MOHAPATRA' }, { key: 'status', label: 'Status', default: 'Active', entityLabel: 'status' }, { key: 'color', label: 'Color', type: 'color', default: '#6b7280' }, { key: 'designation', label: 'Designation', placeholder: 'e.g., District & Sessions Judge' }], defaults: { status: 'Active' } },
};

/* ================================================================
   Main component
   ================================================================ */
export default function CreateCase() {
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    handler(mql);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const { caseTypes, refresh: refreshCaseTypes } = useCaseTypes();
  const { names: stageNames, refresh: refreshStages } = useCaseStages();
  const { priorities, refresh: refreshPriorities } = usePriorities();
  const { courts, refresh: refreshCourts } = useCourts();
  const { benchTypes, refresh: refreshBenchTypes } = useBenchTypes();
  const { jurisdictions, refresh: refreshJurisdictions } = useJurisdictions();
  const { judges, refresh: refreshJudges } = useJudges();

  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    clientLogic.list().then((r) => {
      setClients(Array.isArray(r) ? r : []);
    }).catch(() => { setClients([]); });
    userLogic.list().then((r) => {
      setUsers(Array.isArray(r) ? r : []);
    }).catch(() => { setUsers([]); });
  }, []);

  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [plaintiffInput, setPlaintiffInput] = useState('');
  const [defendantInput, setDefendantInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);
  const [crudEntity, setCrudEntity] = useState(null);

  const [allFolders, setAllFolders] = useState([]);
  const [autoCreateFolder, setAutoCreateFolder] = useState(true);

  useEffect(() => {
    caseFolderLogic.listAll().then((r) => setAllFolders(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);

  const openCrudManager = useCallback((entity) => setCrudEntity(entity), []);
  const closeCrudManager = useCallback(() => {
    setCrudEntity(null);
    refreshCaseTypes(); refreshStages(); refreshPriorities();
    refreshCourts(); refreshBenchTypes(); refreshJurisdictions(); refreshJudges();
    clientLogic.list().then((r) => { if (Array.isArray(r)) setClients(r); }).catch(() => { });
  }, [refreshCaseTypes, refreshStages, refreshPriorities, refreshCourts, refreshBenchTypes, refreshJurisdictions, refreshJudges]);

  const setField = useCallback((key, value) => setForm((prev) => ({ ...prev, [key]: value })), []);
  const setFieldEvent = useCallback((key) => (e) => setField(key, e.target.value), [setField]);

  const addPlaintiff = useCallback(() => { const v = plaintiffInput.trim(); if (!v) return; if (!form.plaintiffs.includes(v)) setField('plaintiffs', [...form.plaintiffs, v]); setPlaintiffInput(''); }, [plaintiffInput, form.plaintiffs, setField]);
  const removePlaintiff = useCallback((i) => setField('plaintiffs', form.plaintiffs.filter((_, idx) => idx !== i)), [form.plaintiffs, setField]);
  const addDefendant = useCallback(() => { const v = defendantInput.trim(); if (!v) return; if (!form.defendants.includes(v)) setField('defendants', [...form.defendants, v]); setDefendantInput(''); }, [defendantInput, form.defendants, setField]);
  const removeDefendant = useCallback((i) => setField('defendants', form.defendants.filter((_, idx) => idx !== i)), [form.defendants, setField]);

  const autoTitle = useMemo(() => {
    const pl = form.plaintiffs.join(', '), df = form.defendants.join(', ');
    return [pl, df].filter(Boolean).join(' vs ');
  }, [form.plaintiffs, form.defendants]);

  const autoCourtName = useMemo(() => {
    const h = form.court, j = form.jurisdiction;
    if (h && j) return `${h}, ${j}`;
    return h || j || '';
  }, [form.court, form.jurisdiction]);

  const handleFileChange = useCallback((e) => setSelectedFiles(Array.from(e.target.files || [])), []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    setSelectedFiles(Array.from(e.dataTransfer.files || []));
  }, []);

  const validate = useCallback(() => {
    if (!form.case_number.trim()) { toast.error('Case number is required.'); return false; }
    if (!form.case_type) { toast.error('Case type is required.'); return false; }
    if (!form.plaintiffs.length && !form.defendants.length) { toast.error('At least one plaintiff or defendant is required.'); return false; }
    return true;
  }, [form, toast]);

  const buildPayload = useCallback((draft) => ({
    case_number: form.case_number, case_year: form.case_year,
    status: draft ? 'Draft' : 'Active', case_type: form.case_type,
    plaintiff: form.plaintiffs.join(', '), defendant: form.defendants.join(', '),
    client: form.client, advocate: form.advocate,
    court: form.court, court_name: autoCourtName,
    bench_type: form.bench_type, judge: form.presiding_officer,
    stage: form.stage, priority: form.priority,
    filing_date: form.filing_date, next_hearing: form.next_hearing_date,
    filing_number: form.filing_number, registration_number: form.registration_number,
    cnr_number: form.cnr_number, registration_date: form.registration_date,
    disposal_date: form.disposal_date,
    case_summary: form.case_summary, internal_notes: form.internal_notes,
  }), [form, autoCourtName]);

  const resetForm = useCallback(() => {
    setForm({ ...INITIAL_FORM }); setSelectedFiles([]); setPlaintiffInput(''); setDefendantInput('');
    setAutoCreateFolder(true);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const submitCase = useCallback(async (draft) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = buildPayload(draft);
      const result = await caseLogic.create(payload, user);
      if (result?.id) {
        const targetFolder = !autoCreateFolder && form.document_folder ? form.document_folder : (result.caseNumber || result.case_display_number || 'Miscellaneous');
        for (const file of selectedFiles) {
          await fileLogic.uploadDocument(file, { caseId: result.id, folder: targetFolder }, user);
        }
        toast.success(draft ? 'Draft saved!' : 'Case created successfully!');
        resetForm();
      } else { toast.error('Failed to create case.'); }
    } catch (e) {
      toast.error(e?.message || 'An error occurred.');
    } finally { setSaving(false); }
  }, [validate, buildPayload, form.document_folder, selectedFiles, user, toast, resetForm, autoCreateFolder]);

  /* Options */
  const caseTypeOptions = caseTypes.map((ct) => ({ value: ct.name, label: ct.short_code ? `${ct.short_code} - ${ct.name}` : ct.name }));
  const hierarchyOptions = courts.map((h) => ({ value: h, label: h }));
  const benchTypeOptions = benchTypes.map((b) => ({ value: b, label: b }));
  const jurisdictionOptions = jurisdictions.map((j) => ({ value: j, label: j }));
  const judgeOptions = judges.map((j) => ({ value: j, label: j }));
  const stageOptions = stageNames.map((s) => ({ value: s, label: s }));
  const clientOptions = clients.map((c) => ({ value: c.name, label: c.name }));
  const userOptions = users.map((u) => ({ value: u.name, label: u.name }));
  const activeEntityConfig = ENTITY_CONFIGS[crudEntity];
  const refreshMap = {
    'Case Type': refreshCaseTypes,
    Courts: refreshCourts, 'Bench Type': refreshBenchTypes,
    Jurisdiction: refreshJurisdictions, Stage: refreshStages, Priority: refreshPriorities,
    Client: () => clientLogic.list().then((r) => { if (Array.isArray(r)) setClients(r); }).catch(() => { }),
    Advocate: () => userLogic.list().then((r) => { if (Array.isArray(r)) setUsers(r); }).catch(() => { }),
    Judge: refreshJudges,
  };

  const summaryLen = (form.case_summary || '').length;
  const notesLen = (form.internal_notes || '').length;

  return (
    <div className="page-area pb-80">

      {/* Crud Manager Modal */}
      {crudEntity && activeEntityConfig && (
        <CrudManager
          open={!!crudEntity}
          onClose={closeCrudManager}
          entity={crudEntity}
          config={{ ...activeEntityConfig, refresh: refreshMap[crudEntity], actor: crudEntity === 'Advocate' ? user : undefined }}
        />
      )}

      {/* ---- Top bar ---- */}
      {!isMobile ? (
        <div className="bench-types__hero">
          <div className="bench-types__hero-icon"><Icon name="pen" size={34} /></div>
          <div className="bench-types__hero-text">
            <h2>Create Cases</h2>
            <p>Fill in the details below to create a new case</p>
            <div className="bench-types__hero-accent" />
          </div>
          <Button variant="ghost" icon="download" className="ml-auto">Load from Template</Button>
          <Icon name="pen" className="bench-types__hero-watermark bench-types__watermark-icon" />
        </div>
      ) : (
        <div className="bench-types__hero mb-20">
          <div className="bench-types__hero-icon"><Icon name="pen" size={34} /></div>
          <div className="bench-types__hero-text">
            <h2>Create Cases</h2>
            <p>Fill in the details below to create a new case</p>
            <div className="bench-types__hero-accent" />
            <Button variant="ghost" icon="download">Load</Button>
          </div>
          <Icon name="pen" className="bench-types__hero-watermark bench-types__watermark-icon" />
        </div>
      )}

      {/* ---- 1. Case Header ---- */}
      <SectionCard num="1" title="Case Header">
        <div className="grid-4">
          <Field label="Case Type" required>
            <GearSelect
              value={form.case_type} onChange={setFieldEvent('case_type')}
              options={caseTypeOptions} placeholder="Select case type"
              entity="Case Type" onGearClick={openCrudManager}
            />
          </Field>
          <Field label="Case Number" required>
            <Input value={form.case_number} onChange={setFieldEvent('case_number')} placeholder="e.g., 123/2024" />
          </Field>
          <Field label="Case Year" required>
            <Input value={form.case_year} onChange={setFieldEvent('case_year')} placeholder="e.g., 2024" type="text" />
          </Field>
          <Field label="Case Stage">
            <GearSelect
              value={form.stage} onChange={setFieldEvent('stage')}
              options={stageOptions} placeholder="Select stage"
              entity="Stage" onGearClick={openCrudManager}
            />
          </Field>
        </div>
      </SectionCard>

      {/* ---- 2. Parties ---- */}
      <SectionCard num="2" title="Parties">
        <div className="grid-2 mb-16">
          <PartyColumn
            label="Plaintiff / Petitioner"
            items={form.plaintiffs}
            inputValue={plaintiffInput}
            onInputChange={setPlaintiffInput}
            onAdd={addPlaintiff}
            onRemove={removePlaintiff}
            placeholder="Enter plaintiff / petitioner name"
          />
          <PartyColumn
            label="Defendant / Respondent"
            items={form.defendants}
            inputValue={defendantInput}
            onInputChange={setDefendantInput}
            onAdd={addDefendant}
            onRemove={removeDefendant}
            placeholder="Enter defendant / respondent name"
          />
        </div>
        <Field label="Cause Title">
          <div className="cc-cause-title">
            <Input value={autoTitle} readOnly placeholder="Auto-generated from parties" />
          </div>
        </Field>
      </SectionCard>

      {/* ---- 3. Assignment ---- */}
      <SectionCard num="3" title="Assignment">
        <div className="grid-2">
          <Field label="Client">
            <GearSelect
              value={form.client} onChange={setFieldEvent('client')}
              options={clientOptions} placeholder="Select client"
              entity="Client" onGearClick={openCrudManager}
            />
          </Field>
          <Field label="Advocate">
            <GearSelect
              value={form.advocate} onChange={setFieldEvent('advocate')}
              options={userOptions} placeholder="Select advocate"
              entity="Advocate" onGearClick={openCrudManager}
            />
          </Field>
        </div>
      </SectionCard>

      {/* ---- 4. Court Information ---- */}
      <SectionCard num="4" title="Court Information">
        <div className="grid-2">
          <Field label="Courts" required>
            <GearSelect
              value={form.court} onChange={setFieldEvent('court')}
              options={hierarchyOptions} placeholder="Select court"
              entity="Courts" onGearClick={openCrudManager}
            />
          </Field>
          <Field label="Jurisdiction" required>
            <GearSelect
              value={form.jurisdiction} onChange={setFieldEvent('jurisdiction')}
              options={jurisdictionOptions} placeholder="Select jurisdiction"
              entity="Jurisdiction" onGearClick={openCrudManager}
            />
          </Field>
          <Field label="Court Name">
            <Input value={autoCourtName} readOnly placeholder="Auto-combined from Hierarchy & Jurisdiction" />
          </Field>
          <Field label="Bench Type" required>
            <GearSelect
              value={form.bench_type} onChange={setFieldEvent('bench_type')}
              options={benchTypeOptions} placeholder="Select bench type"
              entity="Bench Type" onGearClick={openCrudManager}
            />
          </Field>
          <Field label="Judge">
            <GearSelect
              value={form.presiding_officer} onChange={setFieldEvent('presiding_officer')}
              options={judgeOptions} placeholder="Select judge"
              entity="Judge" onGearClick={openCrudManager}
            />
          </Field>
        </div>
      </SectionCard>

      {/* ---- 5. Case Tracking ---- */}
      <SectionCard num="5" title="Case Tracking">
        <div className="grid-3">
          <Field label="Priority" required>
            <div>
              <GearSelect
                value={form.priority} onChange={setFieldEvent('priority')}
                options={priorities.map((p) => ({ value: p.name, label: p.name }))}
                placeholder="Select priority"
                entity="Priority" onGearClick={openCrudManager}
              />
              <div className="priority-chips">
                {priorities.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className={`priority-chip${form.priority === p.name ? ' priority-chip--selected' : ''}`}
                    style={{ '--chip-color': p.color }}
                    onClick={() => setField('priority', p.name)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </Field>
          <Field label="Filing Date" required>
            <DateInput value={form.filing_date} onChange={setFieldEvent('filing_date')} />
          </Field>
          <Field label="Next Hearing Date">
            <DateInput value={form.next_hearing_date} onChange={setFieldEvent('next_hearing_date')} />
          </Field>
        </div>
      </SectionCard>

      {/* ---- 6. Identifiers ---- */}
      <SectionCard num="6" title="Identifiers">
        <div className="grid-2">
          <Field label="Filing Number">
            <Input value={form.filing_number} onChange={setFieldEvent('filing_number')} placeholder="Enter filing number" />
          </Field>
          <Field label="Registration Number">
            <Input value={form.registration_number} onChange={setFieldEvent('registration_number')} placeholder="Enter registration number" />
          </Field>
          <Field label="CNR Number">
            <Input value={form.cnr_number} onChange={setFieldEvent('cnr_number')} placeholder="Enter CNR number" />
          </Field>
          <Field label="Registration Date">
            <DateInput value={form.registration_date} onChange={setFieldEvent('registration_date')} />
          </Field>
          <Field label="Disposal Date">
            <DateInput value={form.disposal_date} onChange={setFieldEvent('disposal_date')} />
          </Field>
        </div>
      </SectionCard>

      {/* ---- 7. Summary & Notes ---- */}
      <SectionCard num="7" title="Summary & Notes">
        <div className="grid-2">
          <Field label="Case Summary">
            <div className="pos-relative">
              <Textarea
                value={form.case_summary}
                onChange={setFieldEvent('case_summary')}
                rows={5}
                placeholder="Enter case summary..."
                maxLength={1000}
              />
              <div className="cc__char-counter">{summaryLen} / 1000</div>
            </div>
          </Field>
          <Field label="Internal Notes">
            <div className="pos-relative">
              <Textarea
                value={form.internal_notes}
                onChange={setFieldEvent('internal_notes')}
                rows={5}
                placeholder="Enter internal notes..."
                maxLength={1000}
              />
              <div className="cc__char-counter">{notesLen} / 1000</div>
            </div>
          </Field>
        </div>
      </SectionCard>

      {/* ---- 8. Documents ---- */}
      <SectionCard num="8" title="Documents">
        <div className="grid-2">
          <Field label="Document Folder">
            <div className="flex-col gap-8">
              <label className="cc__folder-checkbox">
                <input type="checkbox" checked={autoCreateFolder} onChange={() => { setAutoCreateFolder(!autoCreateFolder); if (!autoCreateFolder) setField('document_folder', '__auto__'); else setField('document_folder', ''); }} />
                Auto-create folder from case number
              </label>
              {autoCreateFolder ? (
                <div className="muted cc__auto-folder-info">
                  A folder named <strong>CaseType Number/Year</strong> will be created automatically.
                </div>
              ) : (
                <div className="cc__folder-list">
                  {(allFolders.filter((f) => !f.parent_id)).length === 0 ? (
                    <div className="muted cc__no-folders">No existing folders.</div>
                  ) : null}
                  {allFolders.filter((f) => !f.parent_id).map((f) => {
                    const children = allFolders.filter((c) => c.parent_id === f.id);
                    return (
                      <div key={f.id}>
                        <label className={`cc__folder-radio${form.document_folder === f.name ? ' cc__folder-radio--selected' : ''}`}>
                          <input type="radio" name="doc-folder" checked={form.document_folder === f.name} onChange={() => { setAutoCreateFolder(false); setField('document_folder', f.name); }} />
                          <Icon name="folder" size={14} />
                          {f.name}
                        </label>
                        {children.length > 0 && (
                          <div className="pl-20">
                            {children.map((c) => (
                              <label key={c.id} className={`cc__folder-radio cc__folder-radio--child${form.document_folder === c.name ? ' cc__folder-radio--selected' : ''}`}>
                                <input type="radio" name="doc-folder" checked={form.document_folder === c.name} onChange={() => { setAutoCreateFolder(false); setField('document_folder', c.name); }} />
                                <Icon name="folder" size={13} />
                                {c.name}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Field>
          <Field label="Upload Documents">
            <div
              className="cc-file-drop"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={isDragging ? { borderColor: 'var(--navy-600)', background: 'var(--brand-soft)' } : {}}
            >
              <div className="cc-file-drop__icon"><Icon name="upload" size={24} /></div>
              <div className="cc-file-drop__text">
                Drag &amp; drop files here or{' '}
                <span className="cc-file-drop__link">Choose Files</span>
              </div>
              <div className="cc-file-drop__hint">PDF, DOC, DOCX, JPG, PNG (Max. 50MB)</div>
              <input ref={fileRef} type="file" multiple onChange={handleFileChange} className="hidden" />
            </div>
          </Field>
        </div>
        {selectedFiles.length > 0 && (
          <div className="multi-value-container mt-12">
            {selectedFiles.map((file, i) => (
              <span key={i} className="multi-value-item">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </span>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ---- Sticky footer ---- */}
      <div className="cc-footer">
        <button className="btn btn--ghost" onClick={() => nav(-1)} disabled={saving}>
          <Icon name="close" size={15} /> Cancel
        </button>
        <div className="cc-footer__spacer" />
        <button className="btn btn--ghost" onClick={() => submitCase(true)} disabled={saving}>
          <Icon name="save" size={15} /> Save Draft
        </button>
        <button className="btn btn--primary" onClick={() => submitCase(false)} disabled={saving}>
          <Icon name="check" size={15} /> {saving ? 'Creating...' : 'Create Cases'}
        </button>
      </div>
    </div>
  );
}


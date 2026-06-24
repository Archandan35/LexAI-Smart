import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Field, { Input, Textarea } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import CrudManager from '@/components/CrudManager.jsx';
import SearchableSelect from '@/components/SearchableSelect.jsx';
import { caseLogic } from '@/logic/caseLogic.js';
import { clientLogic } from '@/logic/clientLogic.js';
import { userLogic } from '@/logic/userLogic.js';
import { caseStatusLogic } from '@/logic/caseStatusLogic.js';
import { caseTypeLogic } from '@/logic/caseTypeLogic.js';
import { courtHierarchyLogic } from '@/logic/courtHierarchyLogic.js';
import { benchTypeLogic } from '@/logic/benchTypeLogic.js';
import { jurisdictionLogic } from '@/logic/jurisdictionLogic.js';
import { caseStageLogic } from '@/logic/caseStageLogic.js';
import { priorityLogic } from '@/logic/priorityLogic.js';
import { caseFolderLogic } from '@/logic/caseFolderLogic.js';
import { fileLogic } from '@/logic/fileLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useCaseTypes } from '@/hooks/useCaseTypes.js';
import { useCaseStages } from '@/hooks/useCaseStages.js';
import { usePriorities } from '@/hooks/usePriorities.js';
import { useCourtHierarchy } from '@/hooks/useCourtHierarchy.js';
import { useBenchTypes } from '@/hooks/useBenchTypes.js';
import { useJurisdictions } from '@/hooks/useJurisdictions.js';
import { DEFAULT_DOC_FOLDERS } from '@/constants/caseFolders.js';
import DebugPanel, { useLogCapture } from '@/components/DebugPanel.jsx';
import ApiDebugLog, { useApiLog } from '@/components/ApiDebugLog.jsx';

const INITIAL_FORM = {
  case_number: '', case_year: '', case_type: '',
  plaintiffs: [], defendants: [],
  client: '', advocate: '',
  court_hierarchy: '', court_name: '', bench_type: '',
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
        className="icon-btn"
        title={`Manage ${entity}`}
        onClick={() => onGearClick(entity)}
        style={{ padding: 7, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}
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
        <span className="cc-party-col__label">{label} <span style={{ color: 'var(--red)' }}>*</span></span>
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
        <div className="multi-value-container" style={{ marginTop: 10 }}>
          {items.map((item, i) => (
            <span key={i} className="multi-value-item">
              {item}
              <button type="button" className="icon-btn" onClick={() => onRemove(i)} aria-label={`Remove ${item}`} style={{ marginLeft: 4, display: 'inline-flex', border: 'none', background: 'none', cursor: 'pointer', color: 'inherit' }}>
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
  Status: { label: 'Status', logic: caseStatusLogic, fields: [{ key: 'name', label: 'Status Name', placeholder: 'Enter status name' }], defaults: {} },
  'Case Type': { label: 'Case Type', logic: caseTypeLogic, fields: [{ key: 'name', label: 'Case Type Name', placeholder: 'e.g., Civil' }, { key: 'short_code', label: 'Short Code', placeholder: 'e.g., CIV' }], defaults: {} },
  'Court Hierarchy': { label: 'Court Hierarchy', logic: courtHierarchyLogic, fields: [{ key: 'name', label: 'Hierarchy Name', placeholder: 'e.g., Supreme Court' }], defaults: {} },
  'Bench Type': { label: 'Bench Type', logic: benchTypeLogic, fields: [{ key: 'name', label: 'Bench Type Name', placeholder: 'e.g., Single Bench' }, { key: 'short_code', label: 'Short Code', placeholder: 'e.g., SB' }], defaults: {} },
  Jurisdiction: { label: 'Jurisdiction', logic: jurisdictionLogic, fields: [{ key: 'name', label: 'Jurisdiction Name', placeholder: 'e.g., Delhi' }, { key: 'short_code', label: 'Short Code', placeholder: 'e.g., DL' }], defaults: {} },
  Stage: { label: 'Stage', logic: caseStageLogic, fields: [{ key: 'name', label: 'Stage Name', placeholder: 'e.g., Pleading' }], defaults: {} },
  Priority: { label: 'Priority', logic: priorityLogic, fields: [{ key: 'name', label: 'Priority Name', placeholder: 'e.g., High' }, { key: 'color', label: 'Color', type: 'color', default: '#6b7280' }], defaults: {} },
  Client: { label: 'Client', logic: clientLogic, fields: [{ key: 'name', label: 'Client Name', placeholder: 'Enter client name', required: false }, { key: 'phone', label: 'Phone', placeholder: 'e.g., +91 9876543210', required: false }, { key: 'email', label: 'Email', placeholder: 'email@example.com', required: false }, { key: 'address', label: 'Address', placeholder: 'Enter address', required: false }, { key: 'client_type', label: 'Type', placeholder: 'e.g., Individual, Firm', default: 'Individual', required: false }], defaults: {} },
  Advocate: { label: 'Advocate', logic: userLogic, fields: [{ key: 'name', label: 'Name', placeholder: 'Enter advocate name', required: false }, { key: 'email', label: 'Email', placeholder: 'email@example.com', required: false }, { key: 'phone', label: 'Phone', placeholder: 'e.g., +91 9876543210', required: false }, { key: 'address', label: 'Address', placeholder: 'Enter address', required: false }, { key: 'password', label: 'Password', type: 'password', placeholder: 'Set password', required: false }], defaults: {} },
};



/* ================================================================
   Main component
   ================================================================ */
export default function CreateCase() {
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const { logs, clearLogs, copyLogs } = useLogCapture();
  const { entries: apiLogs, add: addApiLog, clear: clearApiLogs } = useApiLog();

  const { caseTypes, refresh: refreshCaseTypes } = useCaseTypes();
  const { names: stageNames, refresh: refreshStages } = useCaseStages();
  const { priorities, refresh: refreshPriorities } = usePriorities();
  const { hierarchy, refresh: refreshHierarchy } = useCourtHierarchy();
  const { benchTypes, refresh: refreshBenchTypes } = useBenchTypes();
  const { jurisdictions, refresh: refreshJurisdictions } = useJurisdictions();

  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    clientLogic.list().then((r) => {
      const ok = Array.isArray(r);
      setClients(ok ? r : []);
      addApiLog(ok ? 'success' : 'error', `loadClients: ${ok ? r.length : 'failed'}`);
    }).catch((e) => { setClients([]); addApiLog('error', 'loadClients exception', e?.message); });
    userLogic.list().then((r) => {
      const ok = Array.isArray(r);
      setUsers(ok ? r : []);
      addApiLog(ok ? 'success' : 'error', `loadUsers: ${ok ? r.length : 'failed'}`);
    }).catch((e) => { setUsers([]); addApiLog('error', 'loadUsers exception', e?.message); });
  }, []);

  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [plaintiffInput, setPlaintiffInput] = useState('');
  const [defendantInput, setDefendantInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);
  const [crudEntity, setCrudEntity] = useState(null);

  const [folderMode, setFolderMode] = useState('select');
  const [customFolderName, setCustomFolderName] = useState('');
  const [subFolderName, setSubFolderName] = useState('');

  const openCrudManager = useCallback((entity) => setCrudEntity(entity), []);
  const closeCrudManager = useCallback(() => {
    setCrudEntity(null);
    refreshCaseTypes(); refreshStages(); refreshPriorities();
    refreshHierarchy(); refreshBenchTypes(); refreshJurisdictions();
    clientLogic.list().then((r) => { if (Array.isArray(r)) setClients(r); }).catch(() => { });
  }, [refreshCaseTypes, refreshStages, refreshPriorities, refreshHierarchy, refreshBenchTypes, refreshJurisdictions]);

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
    const h = form.court_hierarchy, j = form.jurisdiction;
    if (h && j) return `${h}, ${j}`;
    return h || j || '';
  }, [form.court_hierarchy, form.jurisdiction]);

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
    court_hierarchy: form.court_hierarchy, court_name: autoCourtName,
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
    setFolderMode('select'); setCustomFolderName(''); setSubFolderName('');
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const submitCase = useCallback(async (draft) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = buildPayload(draft);
      addApiLog('info', 'Creating case...', payload);
      const result = await caseLogic.create(payload, user);
      if (result?.id) {
        addApiLog('success', `Case created: ${result.case_number || result.id}`, result);
        const targetFolder = form.document_folder || 'Other Documents';
        if (form.document_folder) {
          const parts = form.document_folder.split('/').map((p) => p.trim()).filter(Boolean);
          let parentId = null;
          for (const name of parts) {
            addApiLog('info', `Creating folder: ${name}`);
            const fr = await caseFolderLogic.create(result.id, name, 'document', user, parentId);
            if (fr.ok && fr.data?.id) { parentId = fr.data.id; addApiLog('success', `Folder created: ${name}`); }
            else if (!fr.ok) { addApiLog('warn', `Folder "${name}" failed`, fr.error); toast.warning(`Folder "${name}" failed: ${fr.error}`); break; }
          }
        }
        for (const file of selectedFiles) {
          addApiLog('info', `Uploading: ${file.name}`);
          const ur = await fileLogic.uploadDocument(file, { caseId: result.id, folder: targetFolder }, user);
          if (ur.ok) addApiLog('success', `Uploaded: ${file.name}`, ur.data);
          else addApiLog('error', `Upload failed: ${file.name}`, ur.error);
        }
        toast.success(draft ? 'Draft saved!' : 'Case created successfully!');
        resetForm();
      } else { addApiLog('error', 'createCase: result has no id', result); toast.error('Failed to create case.'); }
    } catch (e) {
      addApiLog('error', 'createCase exception', { message: e?.message, stack: e?.stack });
      toast.error(e?.message || 'An error occurred.');
    } finally { setSaving(false); }
  }, [validate, buildPayload, form.document_folder, selectedFiles, user, toast, resetForm, addApiLog]);

  /* Options */
  const caseTypeOptions = caseTypes.map((ct) => ({ value: ct.name, label: ct.name }));
  const hierarchyOptions = hierarchy.map((h) => ({ value: h, label: h }));
  const benchTypeOptions = benchTypes.map((b) => ({ value: b, label: b }));
  const jurisdictionOptions = jurisdictions.map((j) => ({ value: j, label: j }));
  const stageOptions = stageNames.map((s) => ({ value: s, label: s }));
  const clientOptions = clients.map((c) => ({ value: c.name, label: c.name }));
  const userOptions = users.map((u) => ({ value: u.name, label: u.name }));
  const folderOptions = DEFAULT_DOC_FOLDERS.map((f) => ({ value: f, label: f }));

  const activeEntityConfig = ENTITY_CONFIGS[crudEntity];
  const refreshMap = {
    'Case Type': refreshCaseTypes,
    'Court Hierarchy': refreshHierarchy, 'Bench Type': refreshBenchTypes,
    Jurisdiction: refreshJurisdictions, Stage: refreshStages, Priority: refreshPriorities,
    Client: () => clientLogic.list().then((r) => { if (Array.isArray(r)) setClients(r); }).catch(() => { }),
    Advocate: () => userLogic.list().then((r) => { if (Array.isArray(r)) setUsers(r); }).catch(() => { }),
  };

  const summaryLen = (form.case_summary || '').length;
  const notesLen = (form.internal_notes || '').length;

  const handleFolderSelect = useCallback((val) => {
    if (val === '__create__') {
      setFolderMode('create');
      setField('document_folder', '');
    } else {
      setField('document_folder', val);
      setSubFolderName('');
    }
  }, [setField]);

  const handleFolderCreate = useCallback(() => {
    const n = customFolderName.trim();
    if (!n) return;
    setField('document_folder', n);
    setFolderMode('select');
    setCustomFolderName('');
    setSubFolderName('');
  }, [customFolderName, setField]);

  return (
    <div className="page-area" style={{ paddingBottom: 80 }}>

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
      <div className="cc-topbar">
        <div className="cc-topbar__left">
          <div className="cc-topbar__icon-wrap"><Icon name="pen" size={22} /></div>
          <div>
            <h1 className="cc-topbar__title">Create Case</h1>
            <p className="cc-topbar__sub">Fill in the details below to create a new case</p>
          </div>
        </div>
        <button
          className="btn btn--ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Icon name="download" size={16} /> Load from Template
        </button>
      </div>

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
        <div className="grid-2" style={{ marginBottom: 16 }}>
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
          <Field label="Court Hierarchy" required>
            <GearSelect
              value={form.court_hierarchy} onChange={setFieldEvent('court_hierarchy')}
              options={hierarchyOptions} placeholder="Select hierarchy"
              entity="Court Hierarchy" onGearClick={openCrudManager}
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
          <Field label="Presiding Officer">
            <Input value={form.presiding_officer} onChange={setFieldEvent('presiding_officer')} placeholder="e.g., Justice Sharma" />
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
            <Input type="date" value={form.filing_date} onChange={setFieldEvent('filing_date')} />
          </Field>
          <Field label="Next Hearing Date">
            <Input type="date" value={form.next_hearing_date} onChange={setFieldEvent('next_hearing_date')} />
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
            <Input type="date" value={form.registration_date} onChange={setFieldEvent('registration_date')} />
          </Field>
          <Field label="Disposal Date">
            <Input type="date" value={form.disposal_date} onChange={setFieldEvent('disposal_date')} />
          </Field>
        </div>
      </SectionCard>

      {/* ---- 7. Summary & Notes ---- */}
      <SectionCard num="7" title="Summary & Notes">
        <div className="grid-2">
          <Field label="Case Summary">
            <div style={{ position: 'relative' }}>
              <Textarea
                value={form.case_summary}
                onChange={setFieldEvent('case_summary')}
                rows={5}
                placeholder="Enter case summary..."
                maxLength={1000}
              />
              <div style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>
                {summaryLen} / 1000
              </div>
            </div>
          </Field>
          <Field label="Internal Notes">
            <div style={{ position: 'relative' }}>
              <Textarea
                value={form.internal_notes}
                onChange={setFieldEvent('internal_notes')}
                rows={5}
                placeholder="Enter internal notes..."
                maxLength={1000}
              />
              <div style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>
                {notesLen} / 1000
              </div>
            </div>
          </Field>
        </div>
      </SectionCard>

      {/* ---- 8. Documents ---- */}
      <SectionCard num="8" title="Documents">
        <div className="grid-2">
          <Field label="Document Folder">
            {folderMode === 'select' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <SearchableSelect value={form.document_folder} onChange={(e) => handleFolderSelect(e.target.value)} options={folderOptions} placeholder="Select folder..." />
                  <button type="button" className="btn btn--ghost" style={{ flexShrink: 0 }} onClick={() => handleFolderSelect('__create__')}><Icon name="folderPlus" size={15} /> New</button>
                </div>
                {form.document_folder && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Icon name="chevron" size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                    <Input
                      value={subFolderName}
                      onChange={(e) => {
                        setSubFolderName(e.target.value);
                        setField('document_folder', e.target.value ? `${form.document_folder.split('/')[0]}/${e.target.value}` : form.document_folder.split('/')[0]);
                      }}
                      placeholder="Sub-folder (optional)"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  autoFocus
                  value={customFolderName}
                  onChange={(e) => setCustomFolderName(e.target.value)}
                  placeholder="New folder name..."
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFolderCreate(); } }}
                />
                <Button variant="primary" icon="check" onClick={handleFolderCreate}>Create</Button>
                <Button variant="ghost" onClick={() => { setFolderMode('select'); setCustomFolderName(''); }}>Cancel</Button>
              </div>
            )}
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
              <input ref={fileRef} type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
            </div>
          </Field>
        </div>
        {selectedFiles.length > 0 && (
          <div className="multi-value-container" style={{ marginTop: 12 }}>
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
          <Icon name="check" size={15} /> {saving ? 'Creating...' : 'Create Case'}
        </button>
      </div>
      <ApiDebugLog entries={apiLogs} onClear={clearApiLogs} />
      <DebugPanel logs={logs} onClear={clearLogs} onCopy={copyLogs} />
    </div>
  );
}

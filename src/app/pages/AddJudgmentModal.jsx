import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/Modal.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import DocEditor from '@/components/DocEditor.jsx';
import CrudManager from '@/components/CrudManager.jsx';
import { judgmentsRepository } from '@/data-layer/repositories/judgmentsRepository.js';
import { courtsRepository } from '@/data-layer/repositories/courtsRepository.js';
import { benchTypesRepository } from '@/data-layer/repositories/benchTypesRepository.js';
import { judgesRepository } from '@/data-layer/repositories/judgesRepository.js';
import { caseTypesRepository } from '@/data-layer/repositories/caseTypesRepository.js';
import { jurisdictionsRepository } from '@/data-layer/repositories/jurisdictionsRepository.js';
import { caseStagesRepository } from '@/data-layer/repositories/caseStagesRepository.js';
import { caseStatusesRepository } from '@/data-layer/repositories/caseStatusesRepository.js';
import { prioritiesRepository } from '@/data-layer/repositories/prioritiesRepository.js';
import { partyTypesRepository } from '@/data-layer/repositories/partyTypesRepository.js';
import { areaOfLawRepository } from '@/data-layer/repositories/areaOfLawRepository.js';
import { typeOfProceedingRepository } from '@/data-layer/repositories/typeOfProceedingRepository.js';
import { natureOfDisputeRepository } from '@/data-layer/repositories/natureOfDisputeRepository.js';
import { actsRepository } from '@/data-layer/repositories/actsRepository.js';
import { areaOfLawLogic } from '@/logic/areaOfLawLogic.js';
import { typeOfProceedingLogic } from '@/logic/typeOfProceedingLogic.js';
import { natureOfDisputeLogic } from '@/logic/natureOfDisputeLogic.js';
import { actLogic } from '@/logic/actLogic.js';
import { courtsLogic } from '@/logic/courtsLogic.js';
import { benchTypeLogic } from '@/logic/benchTypeLogic.js';
import { judgeLogic } from '@/logic/judgeLogic.js';
import { caseTypeLogic } from '@/logic/caseTypeLogic.js';
import { jurisdictionLogic } from '@/logic/jurisdictionLogic.js';
import { caseStageLogic } from '@/logic/caseStageLogic.js';
import { caseStatusLogic } from '@/logic/caseStatusLogic.js';
import { priorityLogic } from '@/logic/priorityLogic.js';
import { partyTypeLogic } from '@/logic/partyTypeLogic.js';
import { DateEngine } from '@/core/DateEngine.js';

const TABS = [
  { key: 'general', label: 'General Information', icon: 'info' },
  { key: 'citation', label: 'Citation', icon: 'link' },
  { key: 'headnote', label: 'Headnote', icon: 'book' },
  { key: 'judgement', label: 'Judgement', icon: 'edit' },
  { key: 'classification', label: 'Legal References', icon: 'tag' },

  { key: 'principle', label: 'Legal Principle', icon: 'pen' },

  { key: 'documents', label: 'Documents', icon: 'file' },
  { key: 'notes', label: 'Notes', icon: 'edit' },
  { key: 'review', label: 'Review', icon: 'check-circle' },
];

const PROGRESS_STEPS = [
  'General Information', 'Citation', 'Headnote', 'Judgement',
  'Legal References', 'Legal Principle',
  'Documents', 'Notes', 'Review',
];

const INITIAL_FORM = {
  plaintiff: '',
  defendant: '',
  typeOfProceeding: '',
  natureOfDispute: '',
  act: '',
  plaintiffType: '',
  defendantType: '',
  plaintiffCounsel: '',
  defendantCounsel: '',
  title: '',
  citation: '',
  neutralCitation: '',
  reporterCitation: '',
  caseNumber: '',
  caseType: '',
  court: '',
  bench: '',
  judges: '',
  judgmentDate: '',
  pronouncementDate: '',
  uploadDate: '',
  jurisdiction: '',
  stage: '',
  source: '',
  headnotes: '',
  summary: '',
  practiceArea: '',
  acts: [],
  provisions: [],
  legalIssue: [],
  keywords: [],
  tags: [],
};

function TagInput({ label, values, onChange, placeholder, hint }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v) return;
    onChange([...values, v]);
    setInput('');
  };
  const remove = (idx) => onChange(values.filter((_, i) => i !== idx));
  return (
    <div className="ajm-field">
      <label>{label}</label>
      <div className="ajm-tag-input-wrap">
        {values.map((v, i) => (
          <span key={i} className="ajm-tag">
            {v}
            <button type="button" className="ajm-tag-remove" onClick={() => remove(i)}>&times;</button>
          </span>
        ))}
        <div className="ajm-tag-input-row">
          <input
            className="ajm-input ajm-tag-input"
            type="text"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text');
              const lines = pasted.split('\n').map((s) => s.trim()).filter(Boolean);
              if (lines.length > 1) {
                e.preventDefault();
                onChange([...values, ...lines]);
              }
            }}
          />
          <button type="button" className="ajm-tag-add-btn" onClick={add}><Icon name="plus" size={14} /></button>
        </div>
      </div>
      {hint && <div className="ajm-field-hint">{hint}</div>}
    </div>
  );
}

function SearchableTagInput({ label, values = [], onChange, placeholder, options = [], hint, onCrudClick }) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const wrapperRef = useRef(null);

  const labelMap = useMemo(() => {
    const map = {};
    options.forEach((o) => { map[o.value] = o.label; });
    return map;
  }, [options]);

  const filtered = useMemo(() => {
    if (!input.trim()) return options.filter((o) => !values.includes(o.value));
    const q = input.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) && !values.includes(o.value));
  }, [input, options, values]);

  useEffect(() => {
    function handle(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const addValue = (v) => {
    const trimmed = v.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setInput('');
    setOpen(false);
    setFocusedIdx(-1);
  };

  const remove = (idx) => onChange(values.filter((_, i) => i !== idx));

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (focusedIdx >= 0 && filtered[focusedIdx]) {
        addValue(filtered[focusedIdx].value);
      } else {
        addValue(input);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="ajm-field" ref={wrapperRef}>
      <label>{label}</label>
      <div className="ajm-select-crud-wrap">
        <div className="ajm-tag-input-wrap ajm-tag-input-wrap--grow">
          {values.map((v, i) => (
            <span key={i} className="ajm-tag">
              {labelMap[v] || v}
              <button type="button" className="ajm-tag-remove" onClick={() => remove(i)}>&times;</button>
            </span>
          ))}
          <div className="ajm-tag-input-row" style={{ position: 'relative' }}>
            <input
              className="ajm-input ajm-tag-input"
              type="text"
              placeholder={placeholder}
              value={input}
              onChange={(e) => { setInput(e.target.value); setOpen(true); setFocusedIdx(-1); }}
              onKeyDown={handleKey}
              onFocus={() => setOpen(true)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                const lines = pasted.split('\n').map((s) => s.trim()).filter(Boolean);
                if (lines.length > 1) {
                  e.preventDefault();
                  onChange([...values, ...lines.filter((l) => !values.includes(l))]);
                }
              }}
            />
            <button type="button" className="ajm-tag-add-btn" onClick={() => addValue(input)}><Icon name="plus" size={14} /></button>
            {open && filtered.length > 0 && (
              <div className="searchable-select__dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999 }}>
                {filtered.map((opt, i) => (
                  <div
                    key={opt.value}
                    className={`searchable-select__option${i === focusedIdx ? ' searchable-select__option--focused' : ''}`}
                    onMouseDown={() => addValue(opt.value)}
                    onMouseEnter={() => setFocusedIdx(i)}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {onCrudClick && (
          <button
            type="button"
            className="ajm-crud-btn"
            title={`Manage ${label}`}
            onClick={onCrudClick}
          >
            <Icon name="gear" size={15} />
          </button>
        )}
      </div>
      {hint && <div className="ajm-field-hint">{hint}</div>}
    </div>
  );
}

function MultiSelectWithCrud({ label, required, value = [], onChange, placeholder, options, onCrudClick }) {
  const handleChange = (e) => {
    const selected = Array.from(e.target.options).filter((o) => o.selected).map((o) => o.value);
    onChange(selected);
  };
  return (
    <div className="ajm-field">
      <label>
        {label}
        {required && <span className="ajm-req">*</span>}
      </label>
      <div className="ajm-select-crud-wrap">
        <div className="ajm-select-wrap ajm-select-wrap--grow">
          <select className="ajm-select ajm-select--multi" multiple value={value} onChange={handleChange}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="ajm-select-chevron"><Icon name="chevronDown" size={14} /></span>
        </div>
        <button
          type="button"
          className="ajm-crud-btn"
          title={`Manage ${label}`}
          onClick={onCrudClick}
        >
          <Icon name="gear" size={15} />
        </button>
      </div>
      {value.length > 0 && <div className="ajm-multi-count">{value.length} selected</div>}
    </div>
  );
}

function SelectWithCrud({ label, required, value, onChange, placeholder, options, onCrudClick }) {
  return (
    <div className="ajm-field">
      <label>
        {label}
        {required && <span className="ajm-req">*</span>}
      </label>
      <div className="ajm-select-crud-wrap">
        <div className="ajm-select-wrap ajm-select-wrap--grow">
          <select className="ajm-select" value={value} onChange={onChange}>
            <option value="">{placeholder}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="ajm-select-chevron"><Icon name="chevronDown" size={14} /></span>
        </div>
        <button
          type="button"
          className="ajm-crud-btn"
          title={`Manage ${label}`}
          onClick={onCrudClick}
        >
          <Icon name="gear" size={15} />
        </button>
      </div>
    </div>
  );
}

// Parse a date string typed in the configured format back to yyyy-mm-dd.
function parseToISO(str) {
  if (!str) return '';
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const fmt = DateEngine.getDateFormat();
  const num = (re, order) => {
    const m = re.exec(s);
    if (!m) return null;
    const [d, mo, y] = order.map((i) => m[i]);
    const dt = new Date(`${y}-${mo}-${d}T00:00:00.000Z`);
    return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
  };
  if (fmt === '23.06.2026') return num(/^(\d{2})\.(\d{2})\.(\d{4})$/, [1, 2, 3]) || '';
  if (fmt === '23-06-2026') return num(/^(\d{2})-(\d{2})-(\d{4})$/, [1, 2, 3]) || '';
  if (fmt === '23/06/2026' || fmt === 'dmy') return num(/^(\d{2})\/(\d{2})\/(\d{4})$/, [1, 2, 3]) || '';
  if (fmt === '06/23/2026' || fmt === 'mdy') return num(/^(\d{2})\/(\d{2})\/(\d{4})$/, [2, 1, 3]) || '';
  // Word-based or ISO-like formats: rely on the Date parser.
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

// Date field that honours the global date-format setting: shows the value in
// the configured format, accepts typed input, and opens a native date picker
// (single calendar icon) only when the calendar icon is clicked.
function DateInput({ value, placeholder, onCommit }) {
  const hiddenRef = useRef(null);
  const openPicker = () => {
    const el = hiddenRef.current;
    if (el && el.showPicker) { try { el.showPicker(); } catch { /* ignore */ } }
  };
  return (
    <div className="ajm-date-input">
      <input
        type="text"
        className="ajm-input ajm-date-field"
        placeholder={placeholder}
        value={value ? DateEngine.formatDate(value) : ''}
        onChange={(e) => onCommit(parseToISO(e.target.value))}
        onFocus={(e) => { if (!e.target.value) openPicker(); }}
      />
      <button
        type="button"
        className="ajm-date-cal-icon"
        title="Pick date"
        onClick={openPicker}
        tabIndex={-1}
      >
        <Icon name="calendar" size={14} />
      </button>
      <input
        ref={hiddenRef}
        type="date"
        className="ajm-date-native"
        value={value || ''}
        onChange={(e) => onCommit(e.target.value)}
      />
    </div>
  );
}

export default function AddJudgmentModal({ open, onClose, onSaved, editing }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('general');
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [existingJudgments, setExistingJudgments] = useState([]);
  const [courts, setCourts] = useState([]);
  const [benchTypes, setBenchTypes] = useState([]);
  const [judges, setJudges] = useState([]);
  const [caseTypes, setCaseTypes] = useState([]);
  const [jurisdictions, setJurisdictions] = useState([]);
  const [caseStages, setCaseStages] = useState([]);
  const [caseStatuses, setCaseStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [partyTypes, setPartyTypes] = useState([]);
  const [areaOfLaws, setAreaOfLaws] = useState([]);
  const [typeOfProceedings, setTypeOfProceedings] = useState([]);
  const [natureOfDisputes, setNatureOfDisputes] = useState([]);
  const [allActs, setAllActs] = useState([]);
  const [showActCrud, setShowActCrud] = useState(false);
  const [showCourtCrud, setShowCourtCrud] = useState(false);
  const [showBenchCrud, setShowBenchCrud] = useState(false);
  const [showJudgeCrud, setShowJudgeCrud] = useState(false);
  const [showCaseTypeCrud, setShowCaseTypeCrud] = useState(false);
  const [showJurisdictionCrud, setShowJurisdictionCrud] = useState(false);
  const [showStageCrud, setShowStageCrud] = useState(false);
  const [showCaseStatusCrud, setShowCaseStatusCrud] = useState(false);
  const [showPriorityCrud, setShowPriorityCrud] = useState(false);
  const [showPartyTypeCrud, setShowPartyTypeCrud] = useState(false);
  const [showAreaOfLawCrud, setShowAreaOfLawCrud] = useState(false);
  const [showTypeOfProceedingCrud, setShowTypeOfProceedingCrud] = useState(false);
  const [showNatureOfDisputeCrud, setShowNatureOfDisputeCrud] = useState(false);
  const refreshAll = useMemo(() => ({
    courts: () => courtsRepository.getAll().then(setCourts).catch(() => {}),
    benchTypes: () => benchTypesRepository.getAll().then(setBenchTypes).catch(() => {}),
    judges: () => judgesRepository.getAll().then(setJudges).catch(() => {}),
    caseTypes: () => caseTypesRepository.getAll().then(setCaseTypes).catch(() => {}),
    jurisdictions: () => jurisdictionsRepository.getAll().then(setJurisdictions).catch(() => {}),
    caseStages: () => caseStagesRepository.getAll().then(setCaseStages).catch(() => {}),
    caseStatuses: () => caseStatusesRepository.getAll().then(setCaseStatuses).catch(() => {}),
    priorities: () => prioritiesRepository.getAll().then(setPriorities).catch(() => {}),
    partyTypes: () => partyTypesRepository.getAll().then(setPartyTypes).catch(() => {}),
    areaOfLaws: () => areaOfLawRepository.getAll().then(setAreaOfLaws).catch(() => {}),
    typeOfProceedings: () => typeOfProceedingRepository.getAll().then(setTypeOfProceedings).catch(() => {}),
    natureOfDisputes: () => natureOfDisputeRepository.getAll().then(setNatureOfDisputes).catch(() => {}),
    allActs: () => actsRepository.getAll().then(setAllActs).catch(() => {}),
  }), []);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? { ...INITIAL_FORM, ...editing } : INITIAL_FORM);
    setTab('general');
    Promise.all([
      judgmentsRepository.getAll().catch(() => []),
      courtsRepository.getAll().catch(() => []),
      benchTypesRepository.getAll().catch(() => []),
      judgesRepository.getAll().catch(() => []),
      caseTypesRepository.getAll().catch(() => []),
      jurisdictionsRepository.getAll().catch(() => []),
      caseStagesRepository.getAll().catch(() => []),
      caseStatusesRepository.getAll().catch(() => []),
      prioritiesRepository.getAll().catch(() => []),
      partyTypesRepository.getAll().catch(() => []),
      areaOfLawRepository.getAll().catch(() => []),
      typeOfProceedingRepository.getAll().catch(() => []),
      natureOfDisputeRepository.getAll().catch(() => []),
      actsRepository.getAll().catch(() => []),
    ]).then(([j, c, bt, jg, ct, jr, cs, cst, pr, pt, al, top, nod, act]) => {
      setExistingJudgments(j);
      setCourts(c);
      setBenchTypes(bt);
      setJudges(jg);
      setCaseTypes(ct);
      setJurisdictions(jr);
      setCaseStages(cs);
      setCaseStatuses(cst);
      setPriorities(pr);
      setPartyTypes(pt);
      setAreaOfLaws(al);
      setTypeOfProceedings(top);
      setNatureOfDisputes(nod);
      setAllActs(act);
    });
  }, [open]);

  const selectedTabIndex = useMemo(() => TABS.findIndex((t) => t.key === tab), [tab]);

  const set = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'plaintiff' || field === 'defendant') {
        const p = (field === 'plaintiff' ? value : next.plaintiff).trim();
        const d = (field === 'defendant' ? value : next.defendant).trim();
        next.title = p && d ? `${p} vs ${d}` : p || d || '';
      }
      return next;
    });
  };

  const makeOpts = (data) => data.map((d) => ({ value: d.id, label: d.name }));

  const courtsOpts = useMemo(() => makeOpts(courts), [courts]);
  const benchOpts = useMemo(() => makeOpts(benchTypes), [benchTypes]);
  const judgesOpts = useMemo(() => makeOpts(judges), [judges]);
  const caseTypeOpts = useMemo(() => makeOpts(caseTypes), [caseTypes]);
  const jurisdictionOpts = useMemo(() => makeOpts(jurisdictions), [jurisdictions]);
  const stageOpts = useMemo(() => makeOpts(caseStages), [caseStages]);
  const caseStatusOpts = useMemo(() => makeOpts(caseStatuses), [caseStatuses]);
  const priorityOpts = useMemo(() => makeOpts(priorities), [priorities]);
  const partyTypeOpts = useMemo(() => makeOpts(partyTypes), [partyTypes]);
  const areaOfLawOpts = useMemo(() => makeOpts(areaOfLaws), [areaOfLaws]);
  const typeOfProceedingOpts = useMemo(() => makeOpts(typeOfProceedings), [typeOfProceedings]);
  const natureOfDisputeOpts = useMemo(() => makeOpts(natureOfDisputes), [natureOfDisputes]);
  const actOpts = useMemo(() => (allActs || []).map((a) => ({ value: a.id, label: a.title || a.name })), [allActs]);
  const progressPercent = useMemo(() => {
    if (selectedTabIndex < 0) return 0;
    const totalSteps = PROGRESS_STEPS.length;
    return Math.min(Math.round((selectedTabIndex / totalSteps) * 100), 100);
  }, [selectedTabIndex]);

  const handleSave = async (draft = false) => {
    setSaving(true);
    setSaveError('');
    try {
      const DATE_FIELDS = ['judgmentDate', 'pronouncementDate', 'uploadDate', 'date'];
      const cleaned = { ...form };
      DATE_FIELDS.forEach((f) => {
        if (cleaned[f] === '' || cleaned[f] == null) cleaned[f] = null;
      });
      const entry = {
        ...cleaned,
        date: cleaned.judgmentDate || null,
        status: draft ? 'Draft' : 'Active',
        updatedAt: new Date().toISOString(),
        paragraphs: [],
      };
      if (!Array.isArray(entry.keywords)) entry.keywords = [];
      if (!Array.isArray(entry.acts)) entry.acts = [];
      if (!Array.isArray(entry.provisions)) entry.provisions = [];
      if (!Array.isArray(entry.legalIssue)) entry.legalIssue = [];
      if (!Array.isArray(entry.tags)) entry.tags = [];
      let result;
      if (editing && editing.id) {
        result = await judgmentsRepository.update(editing.id, entry);
      } else {
        result = await judgmentsRepository.create({ ...entry, createdAt: new Date().toISOString() });
      }
      if (!result) throw new Error('Save returned no record');
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error('[AddJudgmentModal] save failed:', err);
      const msg = err?.message || 'Unknown error';
      setSaveError(`Could not save: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (label, fieldKey, placeholder, opts = {}) => {
    const { required, readonly, type } = opts;
    return (
      <div className="ajm-field">
        <label>
          {label}
          {required && <span className="ajm-req">*</span>}
        </label>
        {type === 'date' ? (
          <DateInput
            value={form[fieldKey]}
            placeholder={DateEngine.getDatePlaceholder()}
            onCommit={(iso) => set(fieldKey, iso)}
          />
        ) : (
          <div className={readonly ? 'ajm-field-readonly' : ''}>
            <input
              className={`ajm-input${readonly ? ' ajm-input-readonly' : ''}`}
              type="text"
              placeholder={placeholder}
              value={form[fieldKey] || ''}
              onChange={(e) => set(fieldKey, e.target.value)}
              readOnly={readonly}
            />
            {readonly && <span className="ajm-lock-icon"><Icon name="lock" size={13} /></span>}
          </div>
        )}
        {opts.hint && <div className="ajm-field-hint">{opts.hint}</div>}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (tab) {
      case 'general':
        return (
          <>
            <div className="ajm-section-card">
              <div className="ajm-section-card__head">
                <Icon name="users" size={15} /> Parties & Case Title
              </div>
              <div className="ajm-section-card__body">
                <div className="ajm-grid ajm-grid-2">
                  <SelectWithCrud
                    label="Party Type (Plaintiff)"
                    value={form.plaintiffType}
                    onChange={(e) => set('plaintiffType', e.target.value)}
                    placeholder="Select party type"
                    options={partyTypeOpts}
                    onCrudClick={() => setShowPartyTypeCrud(true)}
                  />
                  {renderField('Plaintiff / Applicant Name', 'plaintiff', 'Enter plaintiff or applicant name', { required: true })}
                </div>
                <div className="ajm-grid ajm-grid-2">
                  <SelectWithCrud
                    label="Party Type (Defendant)"
                    value={form.defendantType}
                    onChange={(e) => set('defendantType', e.target.value)}
                    placeholder="Select party type"
                    options={partyTypeOpts}
                    onCrudClick={() => setShowPartyTypeCrud(true)}
                  />
                  {renderField('Defendant / Respondent Name', 'defendant', 'Enter defendant or respondent name', { required: true })}
                </div>
                <div className="ajm-grid ajm-grid-1">
                  {renderField('Judgment Title', 'title', 'Auto-generated from party names', {
                    readonly: true,
                    hint: 'This field is locked — it will be auto-generated once party names are entered.',
                  })}
                </div>
              </div>
            </div>

            <div className="ajm-section-card">
              <div className="ajm-section-card__head">
                <Icon name="users" size={15} /> Counsel Details
              </div>
              <div className="ajm-section-card__body">
                <div className="ajm-grid ajm-grid-2">
                  {renderField('Plaintiff Counsel', 'plaintiffCounsel', 'Enter counsel name')}
                  {renderField('Defendant Counsel', 'defendantCounsel', 'Enter counsel name')}
                </div>
              </div>
            </div>

            <div className="ajm-section-card">
              <div className="ajm-section-card__head">
                <Icon name="folder" size={15} /> Case Information
              </div>
              <div className="ajm-section-card__body">
                <div className="ajm-grid ajm-grid-2">
                  {renderField('Case Number', 'caseNumber', 'e.g. Civil Appeal No. 1234 of 2024', { required: true })}
                  <SelectWithCrud
                    label="Case Type"
                    required
                    value={form.caseType}
                    onChange={(e) => set('caseType', e.target.value)}
                    placeholder="Select case type"
                    options={caseTypeOpts}
                    onCrudClick={() => setShowCaseTypeCrud(true)}
                  />
                </div>
                <div className="ajm-grid ajm-grid-3">
                  <SelectWithCrud
                    label="Court"
                    required
                    value={form.court}
                    onChange={(e) => set('court', e.target.value)}
                    placeholder="Select court"
                    options={courtsOpts}
                    onCrudClick={() => setShowCourtCrud(true)}
                  />
                  <SelectWithCrud
                    label="Bench"
                    required
                    value={form.bench}
                    onChange={(e) => set('bench', e.target.value)}
                    placeholder="Select bench"
                    options={benchOpts}
                    onCrudClick={() => setShowBenchCrud(true)}
                  />
                  <SelectWithCrud
                    label="Judge(s)"
                    required
                    value={form.judges}
                    onChange={(e) => set('judges', e.target.value)}
                    placeholder="Select one or more judges"
                    options={judgesOpts}
                    onCrudClick={() => setShowJudgeCrud(true)}
                  />
                </div>
              </div>
            </div>

          </>
        );

      case 'citation':
        return (
          <>
            <div className="ajm-section-card">
              <div className="ajm-section-card__head">
                <Icon name="info" size={15} /> Citation Details
              </div>
              <div className="ajm-section-card__body">
                <div className="ajm-grid ajm-grid-3">
                  {renderField('SCR Citation', 'citation', 'e.g. (2024) 1 SCC 1')}
                  {renderField('Neutral Citation', 'neutralCitation', 'e.g. 2024 INSC 1')}
                  {renderField('Reporter Citation', 'reporterCitation', 'e.g. AIR 2024 SC 1')}
                </div>
              </div>
            </div>
            <div className="ajm-section-card">
              <div className="ajm-section-card__head">
                <Icon name="book" size={15} /> Cases Cited in this case
              </div>
              <div className="ajm-section-card__body">
                <TagInput
                  label="Cases Cited"
                  values={form.casesCited || []}
                  onChange={(v) => set('casesCited', v)}
                  placeholder="Type a citation and press Enter or use comma"
                  hint="Add citations referenced in this judgment. Separate with commas or press Enter."
                />
              </div>
            </div>
            <div className="ajm-section-card">
              <div className="ajm-section-card__head">
                <Icon name="calendar" size={15} /> Judgment Dates
              </div>
              <div className="ajm-section-card__body">
                <div className="ajm-grid ajm-grid-3">
                  {renderField('Judgment Date', 'judgmentDate', 'Select judgment date', { type: 'date', required: true })}
                  {renderField('Pronouncement Date', 'pronouncementDate', 'Select pronouncement date', { type: 'date' })}
                  {renderField('Upload Date', 'uploadDate', 'Select upload date', { type: 'date' })}
                </div>
              </div>
            </div>
            <div className="ajm-section-card">
              <div className="ajm-section-card__head">
                <Icon name="link" size={15} /> Judgment Link
              </div>
              <div className="ajm-section-card__body">
                <div className="ajm-field">
                  <label>External Links</label>
                  <input className="ajm-input" type="text" placeholder="e.g. https://indiankanoon.org/doc/..." />
                </div>
              </div>
            </div>
          </>
        );

      case 'headnote':
        return (
          <>
            <div className="ajm-section-card">
              <div className="ajm-section-card__head">
                <Icon name="book" size={15} /> Headnotes
              </div>
              <div className="ajm-section-card__body">
                <div className="ajm-field">
                  <label>Headnotes</label>
                  <div className="ajm-doc-editor">
                    <DocEditor
                      value={form.headnotes}
                      onChange={(html) => set('headnotes', html)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      case 'judgement':
        return (
          <>
            <div className="ajm-section-card">
              <div className="ajm-section-card__head">
                <Icon name="edit" size={15} /> Judgement
              </div>
              <div className="ajm-section-card__body">
                <div className="ajm-field">
                  <label>Judgement</label>
                  <div className="ajm-doc-editor">
                    <DocEditor
                      value={form.summary}
                      onChange={(html) => set('summary', html)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      case 'classification':
        return (
          <>
            <div className="ajm-form-title">Legal References</div>
            <div className="ajm-grid ajm-grid-2">
              <SelectWithCrud
                label="Area of Law"
                value={form.practiceArea}
                onChange={(e) => set('practiceArea', e.target.value)}
                placeholder="Select area of law"
                options={areaOfLawOpts}
                onCrudClick={() => setShowAreaOfLawCrud(true)}
              />
              <SelectWithCrud
                label="Type of Proceeding"
                value={form.typeOfProceeding}
                onChange={(e) => set('typeOfProceeding', e.target.value)}
                placeholder="Select type of proceeding"
                options={typeOfProceedingOpts}
                onCrudClick={() => setShowTypeOfProceedingCrud(true)}
              />
            </div>
            <div className="ajm-grid ajm-grid-2">
              <SelectWithCrud
                label="Nature of Dispute"
                value={form.natureOfDispute}
                onChange={(e) => set('natureOfDispute', e.target.value)}
                placeholder="Select nature of dispute"
                options={natureOfDisputeOpts}
                onCrudClick={() => setShowNatureOfDisputeCrud(true)}
              />
              <SearchableTagInput
                label="Act"
                values={form.acts || []}
                onChange={(v) => set('acts', v)}
                placeholder="Type to search and select acts..."
                options={actOpts}
                onCrudClick={() => setShowActCrud(true)}
              />
            </div>
            <div className="ajm-grid ajm-grid-2">
              <TagInput
                label="Provision(s)"
                values={form.provisions || []}
                onChange={(v) => set('provisions', v)}
                placeholder="e.g. Section 151 CPC, Article 226"
              />
              <TagInput
                label="Legal Issue"
                values={form.legalIssue || []}
                onChange={(v) => set('legalIssue', v)}
                placeholder="e.g. Oral Family Partition, Adverse Possession"
                hint="This is the most valuable research field. Add every legal issue addressed in this judgment."
              />
            </div>
            <div className="ajm-grid ajm-grid-2">
              <TagInput
                label="Keywords"
                values={form.keywords || []}
                onChange={(v) => set('keywords', v)}
                placeholder="e.g. family partition, oral partition, joint family"
              />
              <TagInput
                label="Tags"
                values={form.tags || []}
                onChange={(v) => set('tags', v)}
                placeholder="e.g. expeditious disposal of suit, partition suit"
              />
            </div>
          </>
        );



      case 'principle':
        return (
          <>
            <div className="ajm-form-title">Legal Principle</div>
            <div className="ajm-field">
              <label>Ratio Decidendi</label>
              <textarea className="ajm-input ajm-textarea" placeholder="Enter the ratio decidendi (legal reasoning)..." />
            </div>
            <div className="ajm-field">
              <label>Obiter Dicta</label>
              <textarea className="ajm-input ajm-textarea" placeholder="Enter any obiter dicta..." />
            </div>
            <div className="ajm-field">
              <label>Key Legal Findings</label>
              <textarea className="ajm-input ajm-textarea" placeholder="Enter key legal findings..." />
            </div>
          </>
        );

      case 'documents':
        return (
          <>
            <div className="ajm-form-title">Documents</div>
            <div className="ajm-field">
              <label>Upload Judgment Document</label>
              <input className="ajm-input" type="file" />
            </div>
            <div className="ajm-field">
              <label>Document Notes</label>
              <textarea className="ajm-input ajm-textarea" placeholder="Enter any notes about the uploaded document..." />
            </div>
          </>
        );

      case 'notes':
        return (
          <>
            <div className="ajm-form-title">Notes</div>
            <div className="ajm-field">
              <label>Internal Notes</label>
              <textarea className="ajm-input ajm-textarea" placeholder="Enter private notes..." />
            </div>
          </>
        );

      case 'review':
        return (
          <>
            <div className="ajm-form-title">Review</div>
            <SelectWithCrud
              label="Review Status"
              value={form.reviewStatus}
              onChange={(e) => set('reviewStatus', e.target.value)}
              placeholder="Select review status"
              options={caseStatusOpts}
              onCrudClick={() => setShowCaseStatusCrud(true)}
            />
            <div className="ajm-field">
              <label>Review Comments</label>
              <textarea className="ajm-input ajm-textarea" placeholder="Enter review comments..." />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const courtConfig = {
    logic: courtsLogic,
    fields: [
      { key: 'name', label: 'Court Name', required: true, placeholder: 'e.g. Supreme Court of India' },
      { key: 'short_code', label: 'Short Code', required: true, placeholder: 'e.g. SC-IND' },
      { key: 'description', label: 'Description', type: 'description', full: true },
      { key: 'level', label: 'Court Level', required: true, placeholder: 'e.g. 1 (Supreme), 2 (High Court)' },
      { key: 'parent_id', label: 'Parent Court', required: false, placeholder: 'Parent court ID (optional)' },
      { key: 'status', label: 'Status', required: true },
    ],
    defaults: { status: 'Active', level: '1' },
  };

  const benchConfig = {
    logic: benchTypeLogic,
    fields: [
      { key: 'name', label: 'Bench Type Name', required: true, placeholder: 'e.g. Division Bench' },
      { key: 'short_code', label: 'Short Code', required: true, placeholder: 'e.g. DIV-BENCH' },
      { key: 'description', label: 'Description', type: 'description', full: true },
      { key: 'status', label: 'Status', required: true },
    ],
    defaults: { status: 'Active' },
  };

  const judgeConfig = {
    logic: judgeLogic,
    fields: [
      { key: 'name', label: 'Judge Name', required: true, placeholder: 'e.g. Justice A.K. Sharma' },
      { key: 'short_code', label: 'Short Code', required: true, placeholder: 'e.g. J-AKS' },
      { key: 'designation', label: 'Designation', required: true, placeholder: 'e.g. Chief Justice, Justice' },
      { key: 'court', label: 'Court', required: false, placeholder: 'Associated court' },
      { key: 'description', label: 'Description', type: 'description', full: true },
      { key: 'status', label: 'Status', required: true },
    ],
    defaults: { status: 'Active' },
  };

  const caseTypeConfig = {
    logic: caseTypeLogic,
    fields: [
      { key: 'name', label: 'Case Type Name', required: true, placeholder: 'e.g. Civil Appeal' },
      { key: 'short_code', label: 'Short Code', required: true, placeholder: 'e.g. CA' },
      { key: 'description', label: 'Description', type: 'description', full: true },
      { key: 'status', label: 'Status', required: true },
    ],
    defaults: { status: 'Active' },
  };

  const jurisdictionConfig = {
    logic: jurisdictionLogic,
    fields: [
      { key: 'name', label: 'Jurisdiction Name', required: true, placeholder: 'e.g. Civil' },
      { key: 'short_code', label: 'Short Code', required: true, placeholder: 'e.g. CIV' },
      { key: 'description', label: 'Description', type: 'description', full: true },
      { key: 'status', label: 'Status', required: true },
    ],
    defaults: { status: 'Active' },
  };

  const stageConfig = {
    logic: caseStageLogic,
    fields: [
      { key: 'name', label: 'Stage Name', required: true, placeholder: 'e.g. Pleading' },
      { key: 'short_code', label: 'Short Code', required: true, placeholder: 'e.g. PL' },
      { key: 'description', label: 'Description', type: 'description', full: true },
      { key: 'status', label: 'Status', required: true },
    ],
    defaults: { status: 'Active' },
  };

  const caseStatusConfig = {
    logic: caseStatusLogic,
    fields: [
      { key: 'name', label: 'Status Name', required: true, placeholder: 'e.g. Pending' },
      { key: 'short_code', label: 'Short Code', required: true, placeholder: 'e.g. PND' },
      { key: 'description', label: 'Description', type: 'description', full: true },
      { key: 'status', label: 'Status', required: true },
    ],
    defaults: { status: 'Active' },
  };

  const priorityConfig = {
    logic: priorityLogic,
    fields: [
      { key: 'name', label: 'Priority Name', required: true, placeholder: 'e.g. High' },
      { key: 'short_code', label: 'Short Code', required: true, placeholder: 'e.g. HI' },
      { key: 'description', label: 'Description', type: 'description', full: true },
      { key: 'status', label: 'Status', required: true },
    ],
    defaults: { status: 'Active' },
  };

  const partyTypeConfig = {
    logic: partyTypeLogic,
    fields: [
      { key: 'name', label: 'Party Type Name', required: true, placeholder: 'e.g. Plaintiff' },
      { key: 'short_code', label: 'Short Code', required: true, placeholder: 'e.g. PLT' },
      { key: 'description', label: 'Description', type: 'description', full: true },
      { key: 'status', label: 'Status', required: true },
    ],
    defaults: { status: 'Active' },
  };

  const areaOfLawConfig = {
    logic: areaOfLawLogic,
    fields: [
      { key: 'name', label: 'Area of Law Name', required: true, placeholder: 'e.g. Civil Law' },
      { key: 'short_code', label: 'Short Code', required: true, placeholder: 'e.g. CIV-LAW' },
      { key: 'description', label: 'Description', type: 'description', full: true },
      { key: 'status', label: 'Status', required: true },
    ],
    defaults: { status: 'Active' },
  };

  const typeOfProceedingConfig = {
    logic: typeOfProceedingLogic,
    fields: [
      { key: 'name', label: 'Type of Proceeding Name', required: true, placeholder: 'e.g. Appeal' },
      { key: 'short_code', label: 'Short Code', required: true, placeholder: 'e.g. APP' },
      { key: 'description', label: 'Description', type: 'description', full: true },
      { key: 'status', label: 'Status', required: true },
    ],
    defaults: { status: 'Active' },
  };

  const natureOfDisputeConfig = {
    logic: natureOfDisputeLogic,
    fields: [
      { key: 'name', label: 'Nature of Dispute Name', required: true, placeholder: 'e.g. Contract Dispute' },
      { key: 'short_code', label: 'Short Code', required: true, placeholder: 'e.g. CONT' },
      { key: 'description', label: 'Description', type: 'description', full: true },
      { key: 'status', label: 'Status', required: true },
    ],
    defaults: { status: 'Active' },
  };

  const actConfig = {
    logic: actLogic,
    fields: [
      { key: 'title', label: 'Act Title', required: true, placeholder: 'e.g. Indian Penal Code' },
      { key: 'short_code', label: 'Short Code', required: true, placeholder: 'e.g. IPC' },
      { key: 'act_type', label: 'Act Type', placeholder: 'e.g. Central, State' },
      { key: 'jurisdiction', label: 'Jurisdiction', placeholder: 'e.g. India' },
      { key: 'year', label: 'Year', placeholder: 'e.g. 1860' },
      { key: 'description', label: 'Description', type: 'description', full: true },
      { key: 'status', label: 'Status', required: true },
    ],
    defaults: { status: 'Active' },
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Case Precedent / Judgment' : 'Add Case Precedent / Judgment'}
      subtitle={editing ? 'Update the selected judgment record' : 'Add a new judgment or legal precedent to your knowledge library'}
      size="lg"
      className="ajm-overlay"
      footer={
        <div className="ajm-actions">
          {saveError && <div className="ajm-save-error">{saveError}</div>}
          <Button variant="ghost" onClick={onClose} icon="close">Cancel</Button>
          <div className="ajm-actions-right">
            <Button variant="ghost" icon="save" onClick={() => handleSave(true)} disabled={saving}>Save as Draft</Button>
            <Button variant="ghost" icon="check" onClick={() => handleSave(false)} disabled={saving}>Save</Button>
            <Button variant="primary" icon="arrow" disabled>Next</Button>
          </div>
        </div>
      }
    >
      <div className="ajm-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`ajm-tab${tab === t.key ? ' ajm-tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <Icon name={t.icon} size={13} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="ajm-body">
        <div className="ajm-form-wrap">
          {renderTabContent()}
        </div>

        <aside className="ajm-side">
          <div className="ajm-side-card">
            <h3><Icon name="bookmark" size={15} /> Quick Save</h3>
            <p>Save the judgment as draft to continue later.</p>
            <Button variant="outline" icon="save" onClick={() => handleSave(true)} disabled={saving}>Save as Draft</Button>
          </div>

          <div className="ajm-side-card">
            <div className="ajm-progress-head">
              <h3>Progress</h3>
              <span className="ajm-progress-pct">{progressPercent}% Completed</span>
            </div>
            <div className="ajm-progress-bar"><span style={{ width: `${progressPercent}%` }} /></div>
            <ul className="ajm-progress-list">
              {PROGRESS_STEPS.map((step, i) => (
                <li key={step}>
                  <span className={`ajm-progress-dot${i < selectedTabIndex ? ' ajm-progress-dot--done' : ''}${i === selectedTabIndex ? ' ajm-progress-dot--active' : ''}`}>
                    {i < selectedTabIndex && <Icon name="check" size={8} />}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <div className="ajm-side-card">
            <h3><Icon name="info" size={15} /> Tips</h3>
            <ul className="ajm-tips-list">
              <li><Icon name="check" size={13} /> Add accurate citation for better search results.</li>
              <li><Icon name="check" size={13} /> Select multiple judges by holding Ctrl (Windows) / Cmd (Mac).</li>
              <li><Icon name="check" size={13} /> You can add multiple Acts, Sections, and Keywords in next steps.</li>
              <li><Icon name="check" size={13} /> Upload judgment document in the Documents section.</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* CRUD Modals */}
      <CrudManager open={showCourtCrud} onClose={() => { setShowCourtCrud(false); refreshAll.courts(); }} entity="Court" config={courtConfig} />
      <CrudManager open={showBenchCrud} onClose={() => { setShowBenchCrud(false); refreshAll.benchTypes(); }} entity="Bench Type" config={benchConfig} />
      <CrudManager open={showJudgeCrud} onClose={() => { setShowJudgeCrud(false); refreshAll.judges(); }} entity="Judge" config={judgeConfig} />
      <CrudManager open={showCaseTypeCrud} onClose={() => { setShowCaseTypeCrud(false); refreshAll.caseTypes(); }} entity="Case Type" config={caseTypeConfig} />
      <CrudManager open={showJurisdictionCrud} onClose={() => { setShowJurisdictionCrud(false); refreshAll.jurisdictions(); }} entity="Jurisdiction" config={jurisdictionConfig} />
      <CrudManager open={showStageCrud} onClose={() => { setShowStageCrud(false); refreshAll.caseStages(); }} entity="Stage" config={stageConfig} />
      <CrudManager open={showCaseStatusCrud} onClose={() => { setShowCaseStatusCrud(false); refreshAll.caseStatuses(); }} entity="Status" config={caseStatusConfig} />
      <CrudManager open={showPriorityCrud} onClose={() => { setShowPriorityCrud(false); refreshAll.priorities(); }} entity="Priority" config={priorityConfig} />
      <CrudManager open={showPartyTypeCrud} onClose={() => { setShowPartyTypeCrud(false); refreshAll.partyTypes(); }} entity="Party Type" config={partyTypeConfig} />
      <CrudManager open={showAreaOfLawCrud} onClose={() => { setShowAreaOfLawCrud(false); refreshAll.areaOfLaws(); }} entity="Area of Law" config={areaOfLawConfig} />
      <CrudManager open={showTypeOfProceedingCrud} onClose={() => { setShowTypeOfProceedingCrud(false); refreshAll.typeOfProceedings(); }} entity="Type of Proceeding" config={typeOfProceedingConfig} />
      <CrudManager open={showNatureOfDisputeCrud} onClose={() => { setShowNatureOfDisputeCrud(false); refreshAll.natureOfDisputes(); }} entity="Nature of Dispute" config={natureOfDisputeConfig} />
      <CrudManager open={showActCrud} onClose={() => { setShowActCrud(false); refreshAll.allActs(); }} entity="Acts Library" config={actConfig} />
    </Modal>
  );
}
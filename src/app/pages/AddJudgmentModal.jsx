import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/Modal.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
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
  { key: 'classification', label: 'Legal Classification', icon: 'tag' },
  { key: 'references', label: 'Legal References', icon: 'list' },
  { key: 'principle', label: 'Legal Principle', icon: 'pen' },
  { key: 'applicability', label: 'Applicability', icon: 'star' },
  { key: 'authority', label: 'Authority & Type', icon: 'shield' },
  { key: 'documents', label: 'Documents', icon: 'file' },
  { key: 'notes', label: 'Notes & Links', icon: 'edit' },
  { key: 'review', label: 'Review', icon: 'check-circle' },
];

const PROGRESS_STEPS = [
  'General Information', 'Legal Classification',
  'Legal References', 'Legal Principle', 'Applicability',
  'Authority & Type', 'Documents', 'Notes & Links', 'Review',
];

const INITIAL_FORM = {
  plaintiff: '',
  defendant: '',
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
  summary: '',
};

function SelectWithCrud({ label, required, value, onChange, placeholder, options, onCrudClick }) {
  return (
    <div className="ajm-field">
      <label>
        {label}
        {required && <span className="ajm-req">*</span>}
      </label>
      <div className="ajm-select-crud-wrap">
        <div className="ajm-select-wrap" style={{ flex: 1 }}>
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
// (single calendar icon) when clicked.
function DateInput({ value, placeholder, onCommit }) {
  const hiddenRef = useRef(null);
  const openPicker = () => hiddenRef.current && hiddenRef.current.showPicker && hiddenRef.current.showPicker();
  return (
    <div className="ajm-date-input" onClick={openPicker}>
      <input
        type="text"
        className="ajm-input ajm-date-field"
        placeholder={placeholder}
        value={value ? DateEngine.formatDate(value) : ''}
        onChange={(e) => onCommit(parseToISO(e.target.value))}
      />
      <span className="ajm-date-cal-icon" onClick={(e) => { e.stopPropagation(); openPicker(); }}>
        <Icon name="calendar" size={14} />
      </span>
      <input
        ref={hiddenRef}
        type="date"
        className="ajm-date-hidden"
        value={value || ''}
        onChange={(e) => onCommit(e.target.value)}
      />
    </div>
  );
}

export default function AddJudgmentModal({ open, onClose, onSaved }) {
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

  const [showCourtCrud, setShowCourtCrud] = useState(false);
  const [showBenchCrud, setShowBenchCrud] = useState(false);
  const [showJudgeCrud, setShowJudgeCrud] = useState(false);
  const [showCaseTypeCrud, setShowCaseTypeCrud] = useState(false);
  const [showJurisdictionCrud, setShowJurisdictionCrud] = useState(false);
  const [showStageCrud, setShowStageCrud] = useState(false);
  const [showCaseStatusCrud, setShowCaseStatusCrud] = useState(false);
  const [showPriorityCrud, setShowPriorityCrud] = useState(false);
  const [showPartyTypeCrud, setShowPartyTypeCrud] = useState(false);

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
  }), []);

  useEffect(() => {
    if (!open) return;
    setForm(INITIAL_FORM);
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
    ]).then(([j, c, bt, jg, ct, jr, cs, cst, pr, pt]) => {
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

  const characterCount = form.summary.length;

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
        status: draft ? 'Draft' : 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        keywords: [],
        acts: [],
        paragraphs: [],
      };
      const created = await judgmentsRepository.create(entry);
      if (!created) throw new Error('Save returned no record');
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
                <div className="ajm-grid ajm-grid-2">
                  {renderField('Plaintiff Counsel', 'plaintiffCounsel', 'Enter counsel name')}
                  {renderField('Defendant Counsel', 'defendantCounsel', 'Enter counsel name')}
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
                <Icon name="info" size={15} /> Citation & Case Information
              </div>
              <div className="ajm-section-card__body">
                <div className="ajm-grid ajm-grid-3">
                  {renderField('Citation', 'citation', 'e.g. (2024) 1 SCC 1', { required: true })}
                  {renderField('Neutral Citation', 'neutralCitation', 'e.g. 2024 INSC 1')}
                  {renderField('Reporter Citation', 'reporterCitation', 'e.g. AIR 2024 SC 1')}
                </div>
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
                <Icon name="gear" size={15} /> Other Details
              </div>
              <div className="ajm-section-card__body">
                <div className="ajm-grid ajm-grid-3">
                  <SelectWithCrud
                    label="Jurisdiction"
                    value={form.jurisdiction}
                    onChange={(e) => set('jurisdiction', e.target.value)}
                    placeholder="Select jurisdiction"
                    options={jurisdictionOpts}
                    onCrudClick={() => setShowJurisdictionCrud(true)}
                  />
                  <SelectWithCrud
                    label="Stage"
                    value={form.stage}
                    onChange={(e) => set('stage', e.target.value)}
                    placeholder="Select stage"
                    options={stageOpts}
                    onCrudClick={() => setShowStageCrud(true)}
                  />
                  {renderField('Source', 'source', 'Enter source')}
                </div>
              </div>
            </div>

            <div className="ajm-section-card">
              <div className="ajm-section-card__head">
                <Icon name="edit" size={15} /> Summary
              </div>
              <div className="ajm-section-card__body">
                <div className="ajm-field">
                  <label>Summary (Short)</label>
                  <textarea
                    className="ajm-input ajm-textarea"
                    placeholder="Enter a brief summary of the judgment..."
                    value={form.summary}
                    onChange={(e) => set('summary', e.target.value)}
                    maxLength={500}
                  />
                  <div className="ajm-char-count">{characterCount}/500</div>
                </div>
              </div>
            </div>
          </>
        );

      case 'classification':
        return (
          <>
            <div className="ajm-form-title">Legal Classification</div>
            <div className="ajm-grid ajm-grid-2">
              {renderField('Practice Area', 'practiceArea', 'Enter practice area')}
              {renderField('Subject Matter', 'subjectMatter', 'Enter subject matter')}
            </div>
            <div className="ajm-grid ajm-grid-2">
              {renderField('Keywords / Tags', 'keywords', 'Enter keywords separated by commas')}
              {renderField('Category', 'category', 'Enter category')}
            </div>
          </>
        );

      case 'references':
        return (
          <>
            <div className="ajm-form-title">Legal References</div>
            <div className="ajm-field">
              <label>Acts & Statutes Referenced</label>
              <textarea className="ajm-input ajm-textarea" placeholder="Enter acts and statutes referenced..." />
            </div>
            <div className="ajm-field">
              <label>Sections & Provisions</label>
              <textarea className="ajm-input ajm-textarea" placeholder="Enter sections and provisions..." />
            </div>
            <div className="ajm-field">
              <label>Cases Cited</label>
              <textarea className="ajm-input ajm-textarea" placeholder="Enter cases cited in this judgment..." />
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

      case 'applicability':
        return (
          <>
            <div className="ajm-form-title">Applicability</div>
            <div className="ajm-grid ajm-grid-2">
              <SelectWithCrud
                label="Jurisdictional Scope"
                value={form.jurisdictionalScope}
                onChange={(e) => set('jurisdictionalScope', e.target.value)}
                placeholder="Select scope"
                options={jurisdictionOpts}
                onCrudClick={() => setShowJurisdictionCrud(true)}
              />
              <SelectWithCrud
                label="Precedential Value"
                value={form.precedentialValue}
                onChange={(e) => set('precedentialValue', e.target.value)}
                placeholder="Select value"
                options={priorityOpts}
                onCrudClick={() => setShowPriorityCrud(true)}
              />
            </div>
            <div className="ajm-field">
              <label>Applicable To</label>
              <textarea className="ajm-input ajm-textarea" placeholder="Describe whom this judgment applies to..." />
            </div>
          </>
        );

      case 'authority':
        return (
          <>
            <div className="ajm-form-title">Authority & Type</div>
            <div className="ajm-grid ajm-grid-2">
              <SelectWithCrud
                label="Authority Level"
                value={form.authorityLevel}
                onChange={(e) => set('authorityLevel', e.target.value)}
                placeholder="Select level"
                options={caseStatusOpts}
                onCrudClick={() => setShowCaseStatusCrud(true)}
              />
              {renderField('Judgment Type', 'judgmentType', 'Enter judgment type')}
            </div>
            <div className="ajm-grid ajm-grid-2">
              {renderField('Overruled By', 'overruledBy', 'If overruled, enter citation')}
              {renderField('Followed By', 'followedBy', 'Enter subsequent cases')}
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
            <div className="ajm-form-title">Notes & Links</div>
            <div className="ajm-field">
              <label>Internal Notes</label>
              <textarea className="ajm-input ajm-textarea" placeholder="Enter private notes..." />
            </div>
            <div className="ajm-field">
              <label>External Links</label>
              <input className="ajm-input" type="text" placeholder="e.g. https://indiankanoon.org/doc/..." />
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Case Precedent / Judgment"
      subtitle="Add a new judgment or legal precedent to your knowledge library"
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
    </Modal>
  );
}
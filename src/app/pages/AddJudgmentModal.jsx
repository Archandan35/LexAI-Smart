import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/Modal.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
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

const TABS = [
  { key: 'general', label: 'General Information', icon: 'info' },
  { key: 'parties', label: 'Parties', icon: 'users' },
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
  'General Information', 'Parties', 'Legal Classification',
  'Legal References', 'Legal Principle', 'Applicability',
  'Authority & Type', 'Documents', 'Notes & Links',
];

const INITIAL_FORM = {
  plaintiff: '',
  defendant: '',
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
  language: '',
  source: '',
  summary: '',
};

const LANGUAGES = [
  'English', 'Hindi', 'Arabic', 'Bengali', 'Chinese', 'French',
  'German', 'Italian', 'Japanese', 'Korean', 'Portuguese', 'Russian',
  'Spanish', 'Tamil', 'Telugu', 'Urdu',
];

const SOURCES = [
  'Indian Kanoon', 'SCC Online', 'Manupatra', 'Legal Crystal',
  'Court Website', 'Law Commission', 'High Court Library', 'Other',
];

function SelectWithCrud({ label, required, value, onChange, placeholder, options, crudPath }) {
  const navigate = useNavigate();
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
          onClick={() => navigate(crudPath)}
        >
          <Icon name="gear" size={15} />
        </button>
      </div>
    </div>
  );
}

export default function AddJudgmentModal({ open, onClose, onSaved }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('general');
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
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
  const langOpts = useMemo(() => LANGUAGES.map((l) => ({ value: l, label: l })), []);
  const sourceOpts = useMemo(() => SOURCES.map((s) => ({ value: s, label: s })), []);

  const characterCount = form.summary.length;

  const progressPercent = useMemo(() => {
    if (selectedTabIndex < 0) return 0;
    const totalSteps = PROGRESS_STEPS.length;
    return Math.min(Math.round((selectedTabIndex / totalSteps) * 100), 100);
  }, [selectedTabIndex]);

  const handleSave = async (draft = false) => {
    setSaving(true);
    try {
      const entry = {
        ...form,
        status: draft ? 'Draft' : 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        keywords: [],
        acts: [],
        paragraphs: [],
      };
      await judgmentsRepository.create(entry);
      onSaved?.();
      onClose?.();
    } catch {
      /* error handling */
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
          <div className="ajm-date-input">
            <Icon name="calendar" size={14} />
            {form[fieldKey] || placeholder}
          </div>
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

  const renderSelectField = (label, fieldKey, placeholder, opts = {}) => {
    const { required } = opts;
    return (
      <div className="ajm-field">
        <label>
          {label}
          {required && <span className="ajm-req">*</span>}
        </label>
        <div className="ajm-select-wrap">
          <select
            className="ajm-select"
            value={form[fieldKey] || ''}
            onChange={(e) => set(fieldKey, e.target.value)}
          >
            <option value="">{placeholder}</option>
            {opts.options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="ajm-select-chevron"><Icon name="chevronDown" size={14} /></span>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (tab) {
      case 'general':
        return (
          <>
            <div className="ajm-form-title">General Information</div>

            <div className="ajm-grid ajm-grid-2">
              {renderField('Plaintiff / Applicant Name', 'plaintiff', 'Enter plaintiff or applicant name', { required: true })}
              {renderField('Defendant / Respondent Name', 'defendant', 'Enter defendant or respondent name', { required: true })}
            </div>

            <div className="ajm-grid ajm-grid-1">
              {renderField('Judgment Title', 'title', 'Auto-generated from party names', {
                readonly: true,
                hint: 'This field is locked — it will be auto-generated once party names are entered.',
              })}
            </div>

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
                crudPath="/court-management/case-types"
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
                crudPath="/court-management/courts"
              />
              <SelectWithCrud
                label="Bench"
                required
                value={form.bench}
                onChange={(e) => set('bench', e.target.value)}
                placeholder="Select bench"
                options={benchOpts}
                crudPath="/court-management/bench-types"
              />
              <SelectWithCrud
                label="Judge(s)"
                required
                value={form.judges}
                onChange={(e) => set('judges', e.target.value)}
                placeholder="Select one or more judges"
                options={judgesOpts}
                crudPath="/court-management/judges"
              />
            </div>

            <div className="ajm-grid ajm-grid-3">
              {renderField('Judgment Date', 'judgmentDate', 'Select judgment date', { type: 'date', required: true })}
              {renderField('Pronouncement Date', 'pronouncementDate', 'Select pronouncement date', { type: 'date' })}
              {renderField('Upload Date', 'uploadDate', 'Select upload date', { type: 'date' })}
            </div>

            <div className="ajm-section-title">Other Details</div>

            <div className="ajm-grid ajm-grid-4">
              <SelectWithCrud
                label="Jurisdiction"
                value={form.jurisdiction}
                onChange={(e) => set('jurisdiction', e.target.value)}
                placeholder="Select jurisdiction"
                options={jurisdictionOpts}
                crudPath="/court-management/jurisdictions"
              />
              <SelectWithCrud
                label="Stage"
                value={form.stage}
                onChange={(e) => set('stage', e.target.value)}
                placeholder="Select stage"
                options={stageOpts}
                crudPath="/court-management/case-stages"
              />
              {renderSelectField('Language', 'language', 'Select language', { options: langOpts })}
              {renderSelectField('Source', 'source', 'Select source', { options: sourceOpts })}
            </div>

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
          </>
        );

      case 'parties':
        return (
          <>
            <div className="ajm-form-title">Parties</div>
            <div className="ajm-grid ajm-grid-2">
              <SelectWithCrud
                label="Party Type (Plaintiff)"
                value={form.plaintiffType}
                onChange={(e) => set('plaintiffType', e.target.value)}
                placeholder="Select party type"
                options={partyTypeOpts}
                crudPath="/court-management/party-types"
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
                crudPath="/court-management/party-types"
              />
              {renderField('Defendant / Respondent Name', 'defendant', 'Enter defendant or respondent name', { required: true })}
            </div>
            <div className="ajm-grid ajm-grid-2">
              {renderField('Plaintiff Counsel', 'plaintiffCounsel', 'Enter counsel name')}
              {renderField('Defendant Counsel', 'defendantCounsel', 'Enter counsel name')}
            </div>
          </>
        );

      case 'classification':
        return (
          <>
            <div className="ajm-form-title">Legal Classification</div>
            <div className="ajm-grid ajm-grid-2">
              {renderSelectField('Practice Area', 'practiceArea', 'Select practice area', { options: [] })}
              {renderSelectField('Subject Matter', 'subjectMatter', 'Select subject matter', { options: [] })}
            </div>
            <div className="ajm-grid ajm-grid-2">
              {renderField('Keywords / Tags', 'keywords', 'Enter keywords separated by commas')}
              {renderSelectField('Category', 'category', 'Select category', { options: [] })}
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
                crudPath="/court-management/jurisdictions"
              />
              <SelectWithCrud
                label="Precedential Value"
                value={form.precedentialValue}
                onChange={(e) => set('precedentialValue', e.target.value)}
                placeholder="Select value"
                options={priorityOpts}
                crudPath="/court-management/priorities"
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
                crudPath="/court-management/case-statuses"
              />
              {renderSelectField('Judgment Type', 'judgmentType', 'Select type', { options: [] })}
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
            <div className="ajm-field">
              <label>Review Status</label>
              <div className="ajm-select-wrap">
                <select className="ajm-select">
                  <option value="">Select review status</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="needs-revision">Needs Revision</option>
                </select>
                <span className="ajm-select-chevron"><Icon name="chevronDown" size={14} /></span>
              </div>
            </div>
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
            <h3><Icon name="info" size={15} /> Tips</h3>
            <ul className="ajm-tips-list">
              <li><Icon name="check" size={13} /> Add accurate citation for better search results.</li>
              <li><Icon name="check" size={13} /> Select multiple judges by holding Ctrl (Windows) / Cmd (Mac).</li>
              <li><Icon name="check" size={13} /> You can add multiple Acts, Sections, and Keywords in next steps.</li>
              <li><Icon name="check" size={13} /> Upload judgment document in the Documents section.</li>
            </ul>
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
        </aside>
      </div>
    </Modal>
  );
}

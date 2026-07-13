import { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from './Icon.jsx';
import CrudManager from './CrudManager.jsx';
import { caseStatusLogic } from '@/logic/caseStatusLogic.js';
import { partyTypeLogic } from '@/logic/partyTypeLogic.js';
import { exportPdf, exportDocx } from '@/utils/exportDoc.js';

const STEPS = [
  { num: 1, title: 'HAZIRA', sub: 'Party Details' },
  { num: 2, title: 'PETITION DETAILS', sub: 'Filing Information' },
  { num: 3, title: 'OBJECTION', sub: 'Objection Status' },
  { num: 4, title: "TODAY'S MATTER", sub: 'Hearing Details' },
  { num: 5, title: 'COURT OBSERVATION', sub: 'Court Remarks' },
  { num: 6, title: 'STATUS', sub: 'Order Status' },
  { num: 7, title: 'NEXT DATE', sub: 'Next Hearing' },
  { num: 8, title: 'PUT UP FOR', sub: 'Final Order Line' },
];

const OBJECTION_STATUSES = ['Pending', 'No Objection Filed', 'Objection Filed'];

function Card({ step, form, set, charCount, partyTypes, caseStatuses, onGearParty, onGearStatus, isActive, onCardClick }) {
  return (
    <div id={`sosb-card-${step.num}`} className={`sosb-card${isActive ? ' sosb-card--active' : ''}`} onClick={() => onCardClick(step.num)}>
      {step.num === 1 && (
        <>
          <div className="sosb-card__head">
            <div className="sosb-icon-badge sosb-icon-badge--purple"><Icon name="people-two" size={17} strokeWidth={1.8} /></div>
            <h3>1. HAZIRA (Who is Present) <span className="sosb-req">*</span></h3>
          </div>
          <div className="sosb-dropdown-row">
            <select className="sosb-select sosb-select--grow" value={form.hazira} onChange={(e) => set('hazira', e.target.value)}>
              <option value="">Select party type...</option>
              {partyTypes.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            <button className="sosb-gear-btn" title="Manage party types" onClick={(e) => { e.stopPropagation(); onGearParty(); }}>
              <Icon name="gear" size={16} strokeWidth={1.7} />
            </button>
          </div>
        </>
      )}
      {step.num === 2 && (
        <>
          <div className="sosb-card__head">
            <div className="sosb-icon-badge sosb-icon-badge--blue"><Icon name="doc" size={16} strokeWidth={1.8} /></div>
            <h3>2. PETITION / APPLICATION DETAILS</h3>
          </div>
          <div className="sosb-field sosb-mb-14">
            <label className="sosb-lbl">Filed By <span className="sosb-req">*</span></label>
            <div className="sosb-dropdown-row">
              <select className="sosb-select sosb-select--grow" value={form.filedBy} onChange={(e) => set('filedBy', e.target.value)}>
                <option value="">Select...</option>
                {partyTypes.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <button className="sosb-gear-btn" title="Manage party types" onClick={(e) => { e.stopPropagation(); onGearParty(); }}>
                <Icon name="gear" size={16} strokeWidth={1.7} />
              </button>
            </div>
          </div>
          <div className="sosb-field sosb-mb-8">
            <div className="sosb-field-title-row">
              <label className="sosb-lbl">Petition Name / Title <span className="sosb-req">*</span></label>
              <div className="sosb-clear-action" onClick={(e) => { e.stopPropagation(); set('petitionName', ''); }}>
                <Icon name="trash" size={13} strokeWidth={1.8} /> Clear
              </div>
            </div>
          </div>
          <div className="sosb-field sosb-mb-14">
            <textarea className="sosb-textarea sosb-textarea--minh60" value={form.petitionDetails} onChange={(e) => set('petitionDetails', e.target.value)} placeholder="Enter petition details..." />
            <span className="sosb-charcount">{charCount(form.petitionDetails)}</span>
          </div>
          <div className="sosb-row2">
            <div className="sosb-field">
              <label className="sosb-lbl">Filed On <span className="sosb-req">*</span></label>
              <input className="sosb-input" type="date" placeholder="dd-mm-yyyy" value={form.filedOn} onChange={(e) => set('filedOn', e.target.value)} />
            </div>
            <div className="sosb-field">
              <label className="sosb-lbl">Status <span className="sosb-req">*</span></label>
              <div className="sosb-dropdown-row">
                <select className="sosb-select sosb-select--grow" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="">Select status...</option>
                  {caseStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="sosb-gear-btn" title="Manage statuses" onClick={(e) => { e.stopPropagation(); onGearStatus(); }}>
                  <Icon name="gear" size={16} strokeWidth={1.7} />
                </button>
              </div>
            </div>
          </div>
          <div className="sosb-field sosb-mb-14">
            <label className="sosb-lbl">Description / Details (Optional)</label>
            <textarea className="sosb-textarea" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Enter description or details here..." />
            <span className="sosb-charcount">{charCount(form.description)}</span>
          </div>
          <div className="sosb-add-link">
            <Icon name="plus" size={14} strokeWidth={2} /> Add Another Petition / Application
          </div>
        </>
      )}
      {step.num === 3 && (
        <>
          <div className="sosb-card__head">
            <div className="sosb-icon-badge sosb-icon-badge--green"><Icon name="shield" size={16} strokeWidth={1.8} /></div>
            <h3>3. OBJECTION</h3>
          </div>
          <label className="sosb-lbl">Objection Status <span className="sosb-req">*</span></label>
          <div className="sosb-dropdown-row sosb-mb-14">
            <select className="sosb-select sosb-select--grow" value={form.objectionStatus} onChange={(e) => set('objectionStatus', e.target.value)}>
              {OBJECTION_STATUSES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <label className="sosb-lbl">Objection Filed By <span className="sosb-req">*</span></label>
          <div className="sosb-dropdown-row">
            <select className="sosb-select sosb-select--grow" value={form.objectionFiledBy} onChange={(e) => set('objectionFiledBy', e.target.value)}>
              <option value="">Select...</option>
              {partyTypes.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            <button className="sosb-gear-btn" title="Manage party types" onClick={(e) => { e.stopPropagation(); onGearParty(); }}>
              <Icon name="gear" size={16} strokeWidth={1.7} />
            </button>
          </div>
        </>
      )}
      {step.num === 4 && (
        <>
          <div className="sosb-card__head">
            <div className="sosb-icon-badge sosb-icon-badge--orange"><Icon name="compass" size={16} strokeWidth={1.8} /></div>
            <h3>4. TODAY'S MATTER / HEARING</h3>
          </div>
          <textarea className="sosb-textarea sosb-textarea--minh54" value={form.todaysMatter} onChange={(e) => set('todaysMatter', e.target.value)} placeholder="Describe today's hearing matter..." />
          <span className="sosb-charcount sosb-charcount--static">{charCount(form.todaysMatter)}</span>
        </>
      )}
      {step.num === 5 && (
        <>
          <div className="sosb-card__head">
            <div className="sosb-icon-badge sosb-icon-badge--teal"><Icon name="building" size={16} strokeWidth={1.8} /></div>
            <h3>5. COURT OBSERVATION <span className="sosb-opt">(Optional)</span></h3>
          </div>
          <textarea className="sosb-textarea sosb-textarea--minh44" value={form.courtObservation} onChange={(e) => set('courtObservation', e.target.value)} placeholder="Enter court observation if any..." />
          <span className="sosb-charcount sosb-charcount--static">{charCount(form.courtObservation)}</span>
        </>
      )}
      {step.num === 6 && (
        <>
          <div className="sosb-card__head">
            <div className="sosb-icon-badge sosb-icon-badge--yellow"><Icon name="star" size={16} strokeWidth={1.6} /></div>
            <h3>6. STATUS <span className="sosb-opt">(Order Status)</span></h3>
          </div>
          <label className="sosb-lbl">Status <span className="sosb-req">*</span></label>
          <div className="sosb-dropdown-row">
            <select className="sosb-select sosb-select--grow" value={form.orderStatus} onChange={(e) => set('orderStatus', e.target.value)}>
              <option value="">Select status...</option>
              {caseStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="sosb-gear-btn" title="Manage statuses" onClick={(e) => { e.stopPropagation(); onGearStatus(); }}>
              <Icon name="gear" size={16} strokeWidth={1.7} />
            </button>
          </div>
        </>
      )}
      {step.num === 7 && (
        <>
          <div className="sosb-card__head">
            <div className="sosb-icon-badge sosb-icon-badge--red"><Icon name="calendar" size={16} strokeWidth={1.8} /></div>
            <h3>7. NEXT DATE</h3>
          </div>
          <div className="sosb-row2">
            <div className="sosb-field">
              <label className="sosb-lbl">Next Date <span className="sosb-req">*</span></label>
              <input className="sosb-input" type="date" placeholder="dd-mm-yyyy" value={form.nextDate} onChange={(e) => set('nextDate', e.target.value)} />
            </div>
            <div className="sosb-field">
              <label className="sosb-lbl">Purpose <span className="sosb-req">*</span></label>
              <input className="sosb-input" type="text" value={form.nextPurpose} onChange={(e) => set('nextPurpose', e.target.value)} placeholder="Enter purpose..." />
            </div>
          </div>
        </>
      )}
      {step.num === 8 && (
        <>
          <div className="sosb-card__head">
            <div className="sosb-icon-badge sosb-icon-badge--purple"><Icon name="arrow-up" size={16} strokeWidth={1.9} /></div>
            <h3>8. PUT UP FOR <span className="sosb-opt">(This will be the last line in the order)</span></h3>
          </div>
          <div className="sosb-highlight-box">
            {form.putUpFor || 'Put up for order and any requisite notice to the respondent party of petition dated...'}
            <span className="sosb-charcount">{charCount(form.putUpFor)}</span>
          </div>
          <textarea className="sosb-textarea sosb-textarea--mt12-minh44" value={form.putUpFor} onChange={(e) => set('putUpFor', e.target.value)} placeholder="Enter final order line..." />
        </>
      )}
    </div>
  );
}

export default function SmartOrderSheetBuilder({ hearing, partyTypes = [], caseStatuses = [], onSave, onClose, onRefreshPartyTypes, onRefreshStatuses }) {
  const [activeStep, setActiveStep] = useState(1);
  const [showPartyTypeCrud, setShowPartyTypeCrud] = useState(false);
  const [showStatusCrud, setShowStatusCrud] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    handler(mql);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const [form, setForm] = useState({
    hazira: '',
    filedBy: '',
    petitionName: '',
    petitionDetails: '',
    filedOn: '',
    status: '',
    description: '',
    objectionStatus: 'Pending',
    objectionFiledBy: '',
    todaysMatter: '',
    courtObservation: '',
    orderStatus: '',
    nextDate: '',
    nextPurpose: '',
    putUpFor: '',
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const charCount = (str) => `${(str || '').length}/250`;

  const orderContent = useMemo(() => {
    const parts = [];
    if (form.hazira) parts.push(`<p><strong>Hazira:</strong> ${form.hazira}</p>`);
    if (form.petitionDetails) parts.push(`<p><strong>Petition Details:</strong> ${form.petitionDetails}</p>`);
    if (form.filedBy) parts.push(`<p><strong>Filed By:</strong> ${form.filedBy}</p>`);
    if (form.filedOn) parts.push(`<p><strong>Filed On:</strong> ${form.filedOn}</p>`);
    if (form.objectionStatus) parts.push(`<p><strong>Objection Status:</strong> ${form.objectionStatus}</p>`);
    if (form.objectionFiledBy) parts.push(`<p><strong>Objection Filed By:</strong> ${form.objectionFiledBy}</p>`);
    if (form.todaysMatter) parts.push(`<p><strong>Today's Matter:</strong> ${form.todaysMatter}</p>`);
    if (form.courtObservation) parts.push(`<p><strong>Court Observation:</strong> ${form.courtObservation}</p>`);
    if (form.orderStatus) parts.push(`<p><strong>Order Status:</strong> ${form.orderStatus}</p>`);
    if (form.nextDate) parts.push(`<p><strong>Next Date:</strong> ${form.nextDate}</p>`);
    if (form.nextPurpose) parts.push(`<p><strong>Purpose:</strong> ${form.nextPurpose}</p>`);
    if (form.putUpFor) parts.push(`<p><strong>Put Up For:</strong> ${form.putUpFor}</p>`);
    return parts.join('\n');
  }, [form]);

  const handleSaveDraft = useCallback(() => {
    onSave?.(form);
  }, [form, onSave]);

  const handlePreviewPdf = useCallback(() => {
    exportPdf('Order Sheet', orderContent);
  }, [orderContent]);

  const handleDownloadDocx = useCallback(() => {
    exportDocx('Order Sheet', orderContent);
  }, [orderContent]);

  const handleStepClick = useCallback((num) => {
    setActiveStep(num);
    if (isMobile) {
      const el = document.getElementById(`sosb-card-${num}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isMobile]);

  const handleCardClick = useCallback((num) => {
    setActiveStep(num);
  }, []);

  return (
    <div className="sosb">
      <div className="sosb-topbar">
        <div className="sosb-topbar__title">
          <div className="sosb-topbar__t1">Smart Order Sheet Builder</div>
          <div className="sosb-topbar__t2">Create professional court orders in minutes</div>
        </div>
        <div className="sosb-topbar__actions">
          <button className="sosb-btn sosb-btn--ghost" onClick={handleSaveDraft}>
            <Icon name="save" size={15} strokeWidth={1.7} /> Save Draft
          </button>
          <button className="sosb-btn sosb-btn--ghost" onClick={handlePreviewPdf}>
            <Icon name="doc" size={15} strokeWidth={1.7} /> Preview PDF
          </button>
          <button className="sosb-btn sosb-btn--primary" onClick={handleDownloadDocx}>
            <Icon name="download" size={15} strokeWidth={1.9} /> Download DOCX
          </button>
        </div>
      </div>

      <div className="sosb-layout">
        <div className="sosb-sidebar">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className={`sosb-step ${activeStep === step.num ? 'sosb-step--active' : ''}`}
              onClick={() => handleStepClick(step.num)}
            >
              <div className="sosb-step__num">{step.num}</div>
              <div className="sosb-step__text">
                <div className="sosb-step__title">{step.title}</div>
                <div className="sosb-step__sub">{step.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="sosb-panel">
          <div className="sosb-instruction">
            <Icon name="info" size={17} strokeWidth={1.8} color="#4a3fb0" />
            <div>Select the applicable option from each dropdown below. Use the gear icon to adjust field options.</div>
          </div>

          {isMobile ? (
            STEPS.map((step) => (
              <Card
                key={step.num}
                step={step}
                form={form}
                set={set}
                charCount={charCount}
                partyTypes={partyTypes}
                caseStatuses={caseStatuses}
                onGearParty={() => setShowPartyTypeCrud(true)}
                onGearStatus={() => setShowStatusCrud(true)}
                isActive={activeStep === step.num}
                onCardClick={handleCardClick}
              />
            ))
          ) : (
            <>
              {activeStep === 1 && (
                <Card step={STEPS[0]} form={form} set={set} charCount={charCount} partyTypes={partyTypes} caseStatuses={caseStatuses}
                  onGearParty={() => setShowPartyTypeCrud(true)} onGearStatus={() => setShowStatusCrud(true)} isActive onCardClick={() => {}} />
              )}
              {activeStep === 2 && (
                <Card step={STEPS[1]} form={form} set={set} charCount={charCount} partyTypes={partyTypes} caseStatuses={caseStatuses}
                  onGearParty={() => setShowPartyTypeCrud(true)} onGearStatus={() => setShowStatusCrud(true)} isActive onCardClick={() => {}} />
              )}
              {activeStep === 3 && (
                <Card step={STEPS[2]} form={form} set={set} charCount={charCount} partyTypes={partyTypes} caseStatuses={caseStatuses}
                  onGearParty={() => setShowPartyTypeCrud(true)} onGearStatus={() => setShowStatusCrud(true)} isActive onCardClick={() => {}} />
              )}
              {activeStep === 4 && (
                <Card step={STEPS[3]} form={form} set={set} charCount={charCount} partyTypes={partyTypes} caseStatuses={caseStatuses}
                  onGearParty={() => setShowPartyTypeCrud(true)} onGearStatus={() => setShowStatusCrud(true)} isActive onCardClick={() => {}} />
              )}
              {activeStep === 5 && (
                <Card step={STEPS[4]} form={form} set={set} charCount={charCount} partyTypes={partyTypes} caseStatuses={caseStatuses}
                  onGearParty={() => setShowPartyTypeCrud(true)} onGearStatus={() => setShowStatusCrud(true)} isActive onCardClick={() => {}} />
              )}
              {activeStep === 6 && (
                <Card step={STEPS[5]} form={form} set={set} charCount={charCount} partyTypes={partyTypes} caseStatuses={caseStatuses}
                  onGearParty={() => setShowPartyTypeCrud(true)} onGearStatus={() => setShowStatusCrud(true)} isActive onCardClick={() => {}} />
              )}
              {activeStep === 7 && (
                <Card step={STEPS[6]} form={form} set={set} charCount={charCount} partyTypes={partyTypes} caseStatuses={caseStatuses}
                  onGearParty={() => setShowPartyTypeCrud(true)} onGearStatus={() => setShowStatusCrud(true)} isActive onCardClick={() => {}} />
              )}
              {activeStep === 8 && (
                <Card step={STEPS[7]} form={form} set={set} charCount={charCount} partyTypes={partyTypes} caseStatuses={caseStatuses}
                  onGearParty={() => setShowPartyTypeCrud(true)} onGearStatus={() => setShowStatusCrud(true)} isActive onCardClick={() => {}} />
              )}
            </>
          )}
        </div>

        <div className="sosb-preview">
          <div className="sosb-preview__top">
            <div className="sosb-preview__live"><span className="sosb-dot"></span>LIVE ORDER SHEET / DRAFT PREVIEW</div>
            <div className="sosb-wordcount">Word Count <b>0</b></div>
          </div>
          <div className="sosb-toolbar">
            <div className="sosb-tb-select">Paragraph <Icon name="chevronDown" size={10} strokeWidth={2} /></div>
            <div className="sosb-tb-divider"></div>
            <div className="sosb-tb-btn"><b>B</b></div>
            <div className="sosb-tb-btn"><i>I</i></div>
            <div className="sosb-tb-btn"><u>U</u></div>
            <div className="sosb-tb-divider"></div>
            <div className="sosb-tb-btn sosb-tb-btn--active"><Icon name="menu" size={15} strokeWidth={2} /></div>
            <div className="sosb-tb-divider"></div>
            <div className="sosb-tb-btn"><Icon name="list" size={15} strokeWidth={2} /></div>
            <div className="sosb-tb-divider"></div>
            <div className="sosb-tb-btn"><Icon name="maximize" size={15} strokeWidth={1.7} /></div>
          </div>
          <div className="sosb-doc-area">
            <div className="sosb-doc-page">
              <div className="sosb-doc-header">
                <h2 className="sosb-doc-title">HAZIRA</h2>
                <div className="sosb-doc-divider"></div>
              </div>
              <p className="sosb-doc-para">Hazira has been filed by the learned counsel for the appellant.</p>
              {form.petitionDetails && <p className="sosb-doc-para">{form.petitionDetails}</p>}
              {form.todaysMatter && <p className="sosb-doc-para">{form.todaysMatter}</p>}
              {form.putUpFor && (
                <div className="sosb-doc-callout">
                  <div className="sosb-doc-callout__ic">{form.hazira?.[0] || 'P'}</div>
                  <div><b>Put up for order</b> — {form.putUpFor}</div>
                </div>
              )}
            </div>
          </div>
          <div className="sosb-status-bar">
            <div className="sosb-saved"><Icon name="check-circle" size={13} strokeWidth={2} /> Auto-saved</div>
            <div className="sosb-right-stats">
              <span>Total Words: <b>0</b></span>
            </div>
          </div>
        </div>
      </div>

      <CrudManager
        open={showPartyTypeCrud}
        onClose={() => { setShowPartyTypeCrud(false); onRefreshPartyTypes?.(); }}
        entity="Party Type"
        config={{
          logic: partyTypeLogic,
          fields: [
            { key: 'name', label: 'Party Type Name', placeholder: 'e.g. Appellant, Respondent' },
            { key: 'type', label: 'Type', placeholder: 'e.g. Individual, Organization' },
            { key: 'display_order', label: 'Display Order', type: 'number' },
          ],
          defaults: { type: 'Individual', display_order: 0, status: 'Active' },
          refresh: onRefreshPartyTypes,
        }}
      />

      <CrudManager
        open={showStatusCrud}
        onClose={() => { setShowStatusCrud(false); onRefreshStatuses?.(); }}
        entity="Case Status"
        config={{
          logic: caseStatusLogic,
          fields: [
            { key: 'name', label: 'Status Name', placeholder: 'e.g. Active, Disposed' },
            { key: 'display_order', label: 'Display Order', type: 'number' },
          ],
          defaults: { display_order: 0, status: 'Active' },
          refresh: onRefreshStatuses,
        }}
      />
    </div>
  );
}


import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import Spinner from '@/components/Spinner.jsx';
import ConfirmDialog from '@/components/setup/wizard/ConfirmDialog.jsx';
import { judgmentsRepository } from '@/data-layer/repositories/judgmentsRepository.js';
import { courtsRepository } from '@/data-layer/repositories/courtsRepository.js';
import { benchTypesRepository } from '@/data-layer/repositories/benchTypesRepository.js';
import { judgesRepository } from '@/data-layer/repositories/judgesRepository.js';
import { caseTypesRepository } from '@/data-layer/repositories/caseTypesRepository.js';
import { jurisdictionsRepository } from '@/data-layer/repositories/jurisdictionsRepository.js';
import { caseStagesRepository } from '@/data-layer/repositories/caseStagesRepository.js';
import { partyTypesRepository } from '@/data-layer/repositories/partyTypesRepository.js';
import { caseStatusesRepository } from '@/data-layer/repositories/caseStatusesRepository.js';
import { areaOfLawRepository } from '@/data-layer/repositories/areaOfLawRepository.js';
import { typeOfProceedingRepository } from '@/data-layer/repositories/typeOfProceedingRepository.js';
import { natureOfDisputeRepository } from '@/data-layer/repositories/natureOfDisputeRepository.js';
import { actsRepository } from '@/data-layer/repositories/actsRepository.js';
import { useFormat } from '@/utils/format.js';
import AddJudgmentModal from './AddJudgmentModal.jsx';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'legalPrinciples', label: 'Judgment' },
  { key: 'acts', label: 'Acts & Sections' },
  { key: 'documents', label: 'Documents' },
  { key: 'notes', label: 'Notes' },
  { key: 'linked', label: 'Linked Records' },
  { key: 'history', label: 'History' },
];

function StatusBadge({ status }) {
  if (!status) return <span className="jd-status-pill jd-status-pill--active">Active</span>;
  const cls = `jd-status-pill jd-status-pill--${status.toLowerCase()}`;
  return <span className={cls}>{status}</span>;
}

function MetaItem({ icon, tone, label, value }) {
  if (!value) return null;
  return (
    <div className="jd-meta-item">
      <div className={`jd-meta-icon jd-meta-icon--${tone}`}><Icon name={icon} size={16} /></div>
      <div className="jd-meta-text">
        <div className="jd-meta-label">{label}</div>
        <div className="jd-meta-value">{value}</div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }) {
  if (!value) return null;
  return (
    <div className="jd-info-block">
      <div className="jd-info-label">{label}</div>
      <div className="jd-info-value">{value}</div>
    </div>
  );
}

function ActRow({ act }) {
  const name = typeof act === 'string' ? act : act?.name || act?.act || '';
  const section = typeof act === 'string' ? '' : act?.section || '';
  return (
    <div className="jd-acts-row">
      <Icon name="file" size={14} />
      <span className="jd-acts-name">{name}</span>
      {section && <span className="jd-acts-section">(Section {section})</span>}
    </div>
  );
}

function DocRow({ doc }) {
  const name = doc?.name || doc?.title || 'Document';
  const size = doc?.size || '';
  return (
    <div className="jd-doc-row">
      <div className="jd-doc-icon"><Icon name="file" size={16} /></div>
      <div className="jd-doc-info">
        <div className="jd-doc-name">{name}</div>
        {size && <div className="jd-doc-size">{size}</div>}
      </div>
      <Icon name="download" size={15} className="jd-dl-link" />
    </div>
  );
}

export default function JudgmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatDate } = useFormat();
  const [judgment, setJudgment] = useState(null);
  const [allJudgments, setAllJudgments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [favourite, setFavourite] = useState(false);
  const [pinned, setPinned] = useState(false);

  const [courts, setCourts] = useState([]);
  const [benchTypes, setBenchTypes] = useState([]);
  const [judges, setJudges] = useState([]);
  const [caseTypes, setCaseTypes] = useState([]);
  const [jurisdictions, setJurisdictions] = useState([]);
  const [caseStages, setCaseStages] = useState([]);
  const [partyTypes, setPartyTypes] = useState([]);
  const [caseStatuses, setCaseStatuses] = useState([]);
  const [areaOfLaws, setAreaOfLaws] = useState([]);
  const [typeOfProceedings, setTypeOfProceedings] = useState([]);
  const [natureOfDisputes, setNatureOfDisputes] = useState([]);
  const [allActs, setAllActs] = useState([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    judgmentsRepository.getById(id)
      .then((data) => {
        if (cancelled) return;
        setJudgment(data || null);
        setFavourite(data?.favourite || data?.favorited || false);
        setPinned(!!data?.pinned);
      })
      .catch(() => { if (!cancelled) setJudgment(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    judgmentsRepository.getAll()
      .then((data) => { if (!cancelled) setAllJudgments(data || []); })
      .catch(() => {});
    courtsRepository.getAll().then(setCourts).catch(() => {});
    benchTypesRepository.getAll().then(setBenchTypes).catch(() => {});
    judgesRepository.getAll().then(setJudges).catch(() => {});
    caseTypesRepository.getAll().then(setCaseTypes).catch(() => {});
    jurisdictionsRepository.getAll().then(setJurisdictions).catch(() => {});
    caseStagesRepository.getAll().then(setCaseStages).catch(() => {});
    partyTypesRepository.getAll().then(setPartyTypes).catch(() => {});
    caseStatusesRepository.getAll().then(setCaseStatuses).catch(() => {});
    areaOfLawRepository.getAll().then(setAreaOfLaws).catch(() => {});
    typeOfProceedingRepository.getAll().then(setTypeOfProceedings).catch(() => {});
    natureOfDisputeRepository.getAll().then(setNatureOfDisputes).catch(() => {});
    actsRepository.getAll().then(setAllActs).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const related = useMemo(() => {
    if (!judgment) return [];
    const { court, keywords } = judgment;
    return allJudgments
      .filter((j) => j.id !== judgment.id)
      .filter((j) => {
        if (court && j.court === court) return true;
        if (keywords?.length && j.keywords?.length) {
          return keywords.some((k) => j.keywords.includes(k));
        }
        return false;
      })
      .slice(0, 6);
  }, [judgment, allJudgments]);

  const nameMap = useMemo(() => {
    const build = (arr) => {
      const m = {};
      (arr || []).forEach((r) => { m[r.id] = r.name; });
      return m;
    };
    return {
      court: build(courts), bench: build(benchTypes), judge: build(judges),
      caseType: build(caseTypes), jurisdiction: build(jurisdictions),
      stage: build(caseStages), partyType: build(partyTypes),
      caseStatus: build(caseStatuses),
      areaOfLaw: build(areaOfLaws),
      typeOfProceeding: build(typeOfProceedings),
      natureOfDispute: build(natureOfDisputes),
    };
  }, [courts, benchTypes, judges, caseTypes, jurisdictions, caseStages, partyTypes, caseStatuses, areaOfLaws, typeOfProceedings, natureOfDisputes]);

  const actNameMap = useMemo(() => {
    const m = {};
    (allActs || []).forEach((a) => { m[a.id] = a.title || a.name; });
    return m;
  }, [allActs]);

  const resolve = (map, val) => (val ? (map[val] || val) : '');
  const toArr = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.flatMap((e) => { if (typeof e === 'string') { try { return JSON.parse(e); } catch { return e; } } return e; });
    if (typeof v === 'string') { try { const p = JSON.parse(v); if (Array.isArray(p)) return p; } catch {} return [v]; }
    return [];
  };
  const areaOfLawLabel = (val) => resolve(nameMap.areaOfLaw, val);
  const typeOfProceedingLabel = (val) => resolve(nameMap.typeOfProceeding, val);
  const natureOfDisputeLabel = (val) => resolve(nameMap.natureOfDispute, val);
  const judgeLabel = (val) => {
    return toArr(val).map((v) => nameMap.judge[v?.trim()] || v?.trim() || v).join(', ');
  };
  const courtLabel = (val) => resolve(nameMap.court, val);
  const benchLabel = (val) => resolve(nameMap.bench, val) || judgeLabel(val);
  const caseTypeLabel = (val) => resolve(nameMap.caseType, val);
  const jurisdictionLabel = (val) => resolve(nameMap.jurisdiction, val);
  const stageLabel = (val) => resolve(nameMap.stage, val);
  const partyTypeLabel = (val) => resolve(nameMap.partyType, val);

  const handleDuplicate = () => {
    if (!judgment) return;
    const { id: _id, createdAt, updatedAt, ...rest } = judgment;
    judgmentsRepository.create({
      ...rest,
      title: rest.title ? `${rest.title} (Copy)` : rest.title,
      citation: rest.citation ? `${rest.citation} (Copy)` : rest.citation,
      status: 'Draft',
    })
      .then(() => navigate('/research/judgment-library'))
      .catch(() => {});
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: judgment?.title || 'Judgment', url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const handlePin = () => {
    if (!judgment) return;
    const next = !pinned;
    setPinned(next);
    judgmentsRepository.update(judgment.id, { pinned: next })
      .catch(() => { setPinned(!next); });
  };

  const handleCopyCitation = () => {
    if (!judgment) return;
    const pA = judgment.appellant || judgment.petitioner || judgment.plaintiff || '';
    const pB = judgment.respondent || judgment.respondentName || judgment.defendant || '';
    const citations = [judgment.neutralCitation, judgment.reporterCitation, judgment.citation]
      .filter(Boolean)
      .filter((c, i, arr) => arr.indexOf(c) === i);
    const ref = citations.join(' | ');
    const formatted = (pA && pB)
      ? `${pA} v. ${pB}, ${ref}`.replace(/, $/, '')
      : (ref || judgment.title || '');
    const text = formatted || judgment.title || '';
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
      done();
    }
  };

  const handleDelete = () => {
    if (!judgment) return;
    setConfirmDelete(true);
  };

  const confirmDeleteJudgment = () => {
    if (!judgment) return;
    const delId = judgment.id;
    setConfirmDelete(false);
    judgmentsRepository.delete(delId)
      .then(() => navigate('/research/judgment-library'))
      .catch(() => {});
  };

  const classification = useMemo(() => {
    if (!judgment) return [];
    const rows = [];
    if (judgment.practiceArea) rows.push({ key: 'Area of Law', val: areaOfLawLabel(judgment.practiceArea) });
    if (judgment.typeOfProceeding) rows.push({ key: 'Type of Proceeding', val: typeOfProceedingLabel(judgment.typeOfProceeding) });
    if (judgment.natureOfDispute) rows.push({ key: 'Nature of Dispute', val: natureOfDisputeLabel(judgment.natureOfDispute) });
    if (judgment.caseType) rows.push({ key: 'Case Type', val: caseTypeLabel(judgment.caseType) });
    if (judgment.legalIssue?.length) rows.push({ key: 'Legal Issue', val: toArr(judgment.legalIssue).join(', ') });
    if (judgment.tags?.length) rows.push({ key: 'Tags', val: toArr(judgment.tags).join(', ') });
    if (judgment.provisions?.length) rows.push({ key: 'Provision(s)', val: toArr(judgment.provisions).join(', ') });
    if (judgment.casesCited?.length) rows.push({ key: 'Cases Cited', val: toArr(judgment.casesCited).join(', ') });
    return rows;
  }, [judgment, nameMap]);

  const tags = useMemo(() => toArr(judgment?.keywords), [judgment]);

  const mainColRef = useRef(null);
  const sideColRef = useRef(null);

  useLayoutEffect(() => {
    const main = mainColRef.current;
    const side = sideColRef.current;
    if (!main || !side) return;

    const sync = () => {
      if (window.innerWidth <= 1024) {
        main.style.height = '';
        return;
      }
      main.style.height = Math.round(side.getBoundingClientRect().height) + 'px';
    };

    sync();

    const ro = new ResizeObserver(([entry]) => {
      if (window.innerWidth <= 1024) return;
      const h = entry.contentBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      main.style.height = Math.round(h) + 'px';
    });

    ro.observe(side);

    const onResize = () => {
      if (window.innerWidth <= 1024) {
        main.style.height = '';
      } else {
        sync();
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="jd-page">
        <div className="jd-loading"><Spinner label="Loading judgment…" /></div>
      </div>
    );
  }

  if (!judgment) {
    return (
      <div className="jd-page">
        <div className="jd-empty">
          <Icon name="file" size={48} />
          <div className="jd-empty__title">Judgment not found</div>
          <div className="jd-empty__desc">The judgment you are looking for could not be found.</div>
          <Button variant="ghost" icon="chevronLeft" className="mt-4" onClick={() => navigate('/research/judgment-library')}>
            Back to Judgment Library
          </Button>
        </div>
      </div>
    );
  }

  const {
    title, citation, neutralCitation, reporterCitation, court, date, caseNumber, status,
    appellant, respondent, petitioner, respondentName,
    plaintiff, defendant, plaintiffType, defendantType,
    summary, paragraphs, acts, documents,
  } = judgment;

  const benchText = benchLabel(judgment.bench) || judgeLabel(judgment.judge) || judgeLabel(judgment.judges);
  const judgeText = judgeLabel(judgment.judge) || judgeLabel(judgment.judges);

  const partyA = appellant || petitioner || plaintiff || '';
  const partyB = respondent || respondentName || defendant || '';
  const partyAType = appellant ? 'Appellant' : petitioner ? 'Petitioner' : plaintiff ? (partyTypeLabel(plaintiffType) || 'Plaintiff') : '';
  const partyBType = respondent ? 'Respondent' : defendant ? (partyTypeLabel(defendantType) || 'Defendant') : '';

  const citationList = [citation, neutralCitation, reporterCitation].filter(Boolean);

  return (
    <div className="jd-page">
      <button className="jd-back-link" onClick={() => navigate('/research/judgment-library')}>
        <Icon name="chevronLeft" size={16} />
        Back to Judgments
      </button>

      <div className="jd-toolbar">
        <button type="button" className="jd-tool-btn" onClick={() => setShowEditModal(true)}><Icon name="pen" size={16} /> Edit</button>
        <div className="jd-tool-divider" />
        <button type="button" className="jd-tool-btn" title="Duplicate" onClick={handleDuplicate}><Icon name="copy" size={16} /> Duplicate</button>
        <div className="jd-tool-divider" />
        <button
          type="button"
          className={`jd-tool-btn${favourite ? ' jd-tool-btn--active' : ''}`}
          title="Favourite"
          onClick={() => setFavourite(!favourite)}
        >
          <Icon name="heart" size={16} /> Favourite
        </button>
        <div className="jd-tool-divider" />
        <button type="button" className={`jd-tool-btn${pinned ? ' jd-tool-btn--active' : ''}`} title="Pin" onClick={handlePin}><Icon name="pin" size={16} /> Pin</button>
        <div className="jd-tool-divider" />
        <button type="button" className="jd-tool-btn" title="Share" onClick={handleShare}><Icon name="share" size={16} /> Share</button>
        <div className="jd-tool-divider" />
        <button type="button" className="jd-tool-btn" title="Print" onClick={() => window.print()}><Icon name="print" size={16} /> Print</button>
        <div className="jd-tool-divider" />
        <button type="button" className="jd-tool-btn" title="Download" onClick={handleShare}><Icon name="download" size={16} /> Download</button>
        <div className="jd-tool-divider" />
        <button type="button" className={`jd-tool-btn${copied ? ' jd-tool-btn--active' : ''}`} onClick={handleCopyCitation}><Icon name={copied ? 'check' : 'doclines'} size={16} /> {copied ? 'Copied!' : 'Copy Citation'}</button>
        <div className="jd-tool-divider" />
        <button type="button" className="jd-tool-btn jd-tool-btn--danger" title="Delete" onClick={handleDelete}><Icon name="trash" size={16} /> Delete</button>
        <div className="jd-tool-divider" />
        <button type="button" className="jd-tool-btn" title="More"><Icon name="more-horizontal" size={16} /> More</button>
      </div>

      <div className="jd-case-card">
        <div className="jd-case-head">
          <div className="jd-case-head-left">
            <h1 className="jd-case-title">{title || citation || 'Untitled'}</h1>
            <div className="jd-case-citations">
              {citation && <span className="jd-cit-chip">{citation}</span>}
              {neutralCitation && <span className="jd-cit-chip jd-cit-chip--muted">{neutralCitation}</span>}
            </div>
          </div>
          <div className="jd-case-head-right">
            <StatusBadge status={status} />
          </div>
        </div>

        <div className="jd-case-meta-row">
          <MetaItem icon="building2" tone="purple" label="Court" value={courtLabel(court)} />
          <MetaItem icon="scales2" tone="blue" label="Bench" value={benchText} />
          <MetaItem icon="user2" tone="green" label="Judge(s)" value={judgeText} />
          <MetaItem icon="calendar2" tone="orange" label="Judgment Date" value={date ? formatDate(date) : ''} />
        </div>

        <div className="jd-case-info-row">
          <InfoBlock label="Case Number" value={caseNumber} />
          {(partyA || partyB) && (
            <div className="jd-party-wrap">
              <div className="jd-info-label">Parties</div>
              <div className="jd-party-row">
                {partyA && <span className="jd-party"><span className="jd-party-role">{partyAType}</span> {partyA}</span>}
                {partyB && <span className="jd-party"><span className="jd-party-role">{partyBType}</span> {partyB}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="jd-body-grid">
        <div className="jd-main-col" ref={mainColRef}>
          <div className="jd-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`jd-tab${tab === t.key ? ' jd-tab--active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="jd-tab-panel">
            {tab === 'overview' && (
              <div className="jd-overview-cards">
                <div className="jd-prose-card">
                  <h3 className="jd-panel-title">Headnotes</h3>
                  <div className="jd-prose">
                    {judgment.headnotes
                      ? <span dangerouslySetInnerHTML={{ __html: judgment.headnotes }} />
                      : 'No headnotes recorded for this judgment.'}
                  </div>
                </div>
              </div>
            )}

            {tab === 'legalPrinciples' && (
              <div className="jd-panel-section">
                <h3 className="jd-panel-title">Legal Principle</h3>
                {summary
                  ? <div className="jd-prose" dangerouslySetInnerHTML={{ __html: summary }} />
                  : <div className="jd-prose">No legal principles recorded for this judgment.</div>}
                <h3 className="jd-panel-title jd-panel-title--mt">Ratio Decidendi</h3>
                <div className="jd-prose">{judgment.ratioDecidendi || 'Not specified.'}</div>
                <h3 className="jd-panel-title jd-panel-title--mt">Key Findings</h3>
                <div className="jd-prose">{judgment.keyFindings || 'Not specified.'}</div>
                <h3 className="jd-panel-title jd-panel-title--mt">Final Decision</h3>
                <div className="jd-prose">{judgment.finalDecision || status || 'Not specified.'}</div>
              </div>
            )}

            {tab === 'acts' && (
              <div className="jd-panel-section">
                <h3 className="jd-panel-title">Acts & Sections</h3>
                {acts?.length ? acts.map((act, i) => <ActRow key={i} act={actNameMap[act] || act} />) : (
                  <div className="jd-prose jd-empty-text">No acts referenced.</div>
                )}
                {judgment.act && !acts?.length && (
                  <div className="jd-prose jd-empty-text">{judgment.act}</div>
                )}
              </div>
            )}

            {tab === 'documents' && (
              <div className="jd-panel-section">
                <h3 className="jd-panel-title">Documents</h3>
                {documents?.length ? documents.map((doc, i) => <DocRow key={i} doc={doc} />) : (
                  <div className="jd-prose jd-empty-text">No documents attached.</div>
                )}
              </div>
            )}

            {tab === 'notes' && (
              <div className="jd-panel-section">
                <h3 className="jd-panel-title">Notes</h3>
                <div className="jd-prose">{judgment.notes || 'No notes recorded for this judgment.'}</div>
              </div>
            )}

            {tab === 'linked' && (
              <div className="jd-panel-section">
                <h3 className="jd-panel-title">Linked Records</h3>
                <div className="jd-prose jd-empty-text">No linked records.</div>
              </div>
            )}

            {tab === 'history' && (
              <div className="jd-panel-section">
                <h3 className="jd-panel-title">History</h3>
                <div className="jd-history-list">
                  {judgment.createdAt && (
                    <div className="jd-history-row"><Icon name="plus" size={14} /><span>Created</span><span className="jd-history-date">{formatDate(judgment.createdAt)}</span></div>
                  )}
                  {judgment.updatedAt && (
                    <div className="jd-history-row"><Icon name="refresh" size={14} /><span>Last updated</span><span className="jd-history-date">{formatDate(judgment.updatedAt)}</span></div>
                  )}
                  {judgment.uploadDate && (
                    <div className="jd-history-row"><Icon name="upload" size={14} /><span>Uploaded</span><span className="jd-history-date">{formatDate(judgment.uploadDate)}</span></div>
                  )}
                  {!judgment.createdAt && !judgment.updatedAt && !judgment.uploadDate && (
                    <div className="jd-prose jd-empty-text">No history available.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="jd-side-col" ref={sideColRef}>
          <div className="jd-rc-card">
            <div className="jd-rc-title"><Icon name="tag" size={14} /> Legal References</div>
            <div className="jd-rc-body">
              {classification.length ? classification.map((row, i) => (
                <div key={i} className="jd-rc-row">
                  <span className="jd-rc-key">{row.key}</span>
                  <span className="jd-tag">{row.val}</span>
                </div>
              )) : <div className="jd-empty-text">No classification data.</div>}
              {tags.length > 0 && (
                <div className="jd-rc-row jd-rc-row--tags">
                  <span className="jd-rc-key">Keywords</span>
                  <div className="jd-tags">
                    {tags.map((tag, i) => <span key={i} className="jd-tag">{tag}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="jd-rc-card">
            <div className="jd-rc-title"><Icon name="file" size={14} /> Acts & Sections</div>
            <div className="jd-rc-body">
              {acts?.length ? acts.map((act, i) => <ActRow key={i} act={actNameMap[act] || act} />) : (
                judgment.act ? <div className="jd-empty-text">{judgment.act}</div> : <div className="jd-empty-text">No acts referenced.</div>
              )}
            </div>
          </div>

          <div className="jd-rc-card">
            <div className="jd-rc-title"><Icon name="info" size={14} /> Quick Info</div>
            <div className="jd-rc-body">
              <div className="jd-rc-row"><span className="jd-rc-key">Judgment Type</span><span className="jd-rc-val">{judgment.judgmentType || '—'}</span></div>
              <div className="jd-rc-row"><span className="jd-rc-key">Status</span><span className="jd-rc-val">{status || 'Active'}</span></div>
              <div className="jd-rc-row"><span className="jd-rc-key">Upload Date</span><span className="jd-rc-val">{judgment.uploadDate ? formatDate(judgment.uploadDate) : '—'}</span></div>
              <div className="jd-rc-row"><span className="jd-rc-key">Last Updated</span><span className="jd-rc-val">{judgment.updatedAt ? formatDate(judgment.updatedAt) : '—'}</span></div>
              <div className="jd-rc-row"><span className="jd-rc-key">Views</span><span className="jd-rc-val">{judgment.views ?? '—'}</span></div>
              <div className="jd-rc-row"><span className="jd-rc-key">Favourites</span><span className="jd-rc-val">{judgment.favourites ?? '—'}</span></div>
            {judgment.sourceUrl && (
              <div className="jd-rc-row">
                <span className="jd-rc-key">Judgment Link</span>
                <span className="jd-rc-val"><a href={judgment.sourceUrl} target="_blank" rel="noopener noreferrer">{judgment.sourceUrl}</a></span>
              </div>
            )}
            </div>
          </div>

          <div className="jd-rc-card">
            <div className="jd-rc-title"><Icon name="file" size={14} /> Documents</div>
            <div className="jd-rc-body">
              {documents?.length ? documents.map((doc, i) => <DocRow key={i} doc={doc} />) : (
                <div className="jd-empty-text">No documents attached.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {citationList.length > 1 && (
        <div className="jd-rc-card jd-citation-card">
          <div className="jd-rc-title"><Icon name="link" size={14} /> All Citations</div>
          <div className="jd-rc-body jd-citation-body">
            {citationList.map((c, i) => <span key={i} className="jd-cit-pill">{c}</span>)}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="jd-related-card">
          <div className="jd-related-head"><Icon name="layers" size={14} /> Related Judgments</div>
          <div className="jd-related-grid">
            {related.map((r) => (
              <div key={r.id} className="jd-related-item" onClick={() => navigate(`/research/judgment-library/${r.id}`)}>
                <div className="jd-related-title">{r.title || r.citation}</div>
                <div className="jd-related-court">{courtLabel(r.court)}</div>
                <div className="jd-related-footer">
                  <span className="jd-related-date">{r.date ? formatDate(r.date) : ''}</span>
                  <span className="jd-related-ref">{r.status || r.citation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Judgment"
        message={`Are you sure you want to delete "${title || citation || 'this judgment'}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={confirmDeleteJudgment}
        onCancel={() => setConfirmDelete(false)}
      />

      <AddJudgmentModal
        open={showEditModal}
        editing={judgment}
        onClose={() => setShowEditModal(false)}
        onSaved={() => {
          setShowEditModal(false);
          judgmentsRepository.getById(id).then((d) => d && setJudgment(d)).catch(() => {});
        }}
      />
    </div>
  );
}

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
import { provisionsRepository } from '@/data-layer/repositories/provisionsRepository.js';
import { useFormat } from '@/utils/format.js';
import AddJudgmentModal from './AddJudgmentModal.jsx';
import RelatedJudgmentCard from '@/components/RelatedJudgmentCard.jsx';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'legalPrinciples', label: 'Judgment' },
  { key: 'applicability', label: 'Applicability' },
  { key: 'acts', label: 'Acts & Sections' },
  { key: 'legalAnalysis', label: 'Legal Principles' },
  { key: 'documents', label: 'Documents' },
  { key: 'notes', label: 'Notes' },
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
  return (
    <div className="jd-acts-row">
      <Icon name="file" size={14} />
      <span className="jd-acts-name">{name}</span>
    </div>
  );
}

function ActsSectionsGroup({ acts, provisions, actLabel, provisionLabel }) {
  const resolvedActs = (acts || []).map((a, i) => ({ key: i, label: actLabel(a) }));
  const resolvedProvisions = (provisions || []).map((p, i) => ({ key: i, label: provisionLabel(p) }));
  if (!resolvedActs.length && !resolvedProvisions.length) {
    return <div className="jd-empty-text">No acts referenced.</div>;
  }
  const singleAct = resolvedActs.length === 1;
  return (
    <div className="jd-acts-group">
      {resolvedActs.map((act) => (
        <div className="jd-acts-group-item" key={`act-${act.key}`}>
          <ActRow act={act.label} />
          {singleAct && resolvedProvisions.length > 0 && (
            <ul className="jd-acts-sections">
              {resolvedProvisions.map((p) => (
                <li key={`prov-${p.key}`} className="jd-acts-section-item">{p.label}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {!singleAct && resolvedProvisions.length > 0 && (
        <>
          <div className="jd-acts-group-label">Sections / Provisions</div>
          <ul className="jd-acts-sections">
            {resolvedProvisions.map((p) => (
              <li key={`prov-${p.key}`} className="jd-acts-section-item">{p.label}</li>
            ))}
          </ul>
        </>
      )}
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

function looksLikeId(s) {
  return typeof s === 'string' && (/^PROV/i.test(s) || /^[A-Za-z]+_[A-Za-z0-9]+$/.test(s));
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
  const [allProvisions, setAllProvisions] = useState([]);
  const [provisionDetailsMap, setProvisionDetailsMap] = useState({});

  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actDetailsMap, setActDetailsMap] = useState({});

  const relatedSliderRef = useRef(null);
  const [sliderAtStart, setSliderAtStart] = useState(true);
  const [sliderAtEnd, setSliderAtEnd] = useState(false);

  const updateSliderButtons = () => {
    const el = relatedSliderRef.current;
    if (!el) return;
    setSliderAtStart(el.scrollLeft <= 1);
    setSliderAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  const scrollRelated = (dir) => {
    const el = relatedSliderRef.current;
    if (!el) return;
    const card = el.querySelector('.jd-rel-card');
    const amount = card ? card.offsetWidth + 20 : 320;
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  useLayoutEffect(() => {
    updateSliderButtons();
  });

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
    actsRepository.getAll().then((data) => { if (!cancelled) setAllActs(data || []); }).catch(() => {});
    provisionsRepository.getAll().then((data) => { if (!cancelled) setAllProvisions(data || []); }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!judgment) return;
    const actIds = [];
    if (judgment.acts?.length) actIds.push(...judgment.acts);
    if (judgment.act) actIds.push(judgment.act);
    if (!actIds.length) return;
    const missing = actIds.filter((aid) => aid && !actDetailsMap[aid] && !(allActs || []).some((a) => a.id === aid));
    if (!missing.length) return;
    let cancelled = false;
    missing.forEach((aid) => {
      actsRepository.getById(aid).then((act) => {
        if (cancelled || !act) return;
        setActDetailsMap((prev) => ({ ...prev, [aid]: act }));
      }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [judgment, allActs]);

  useEffect(() => {
    if (!judgment) return;
    const provIds = toArr(judgment.provisions).filter((p) => typeof p === 'string' && looksLikeId(p));
    if (!provIds.length) return;
    const missing = provIds.filter((pid) => pid && !provisionDetailsMap[pid] && !(allProvisions || []).some((p) => p.id === pid));
    if (!missing.length) return;
    let cancelled = false;
    missing.forEach((pid) => {
      provisionsRepository.getById(pid).then((prov) => {
        if (cancelled || !prov) return;
        setProvisionDetailsMap((prev) => ({ ...prev, [pid]: prov }));
      }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [judgment, allProvisions]);

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
    (allActs || []).forEach((a) => { m[a.id] = a.title || a.name || a.short_code || a.id; });
    Object.entries(actDetailsMap).forEach(([id, a]) => {
      if (!m[id]) m[id] = a.title || a.name || a.short_code || a.id;
    });
    return m;
  }, [allActs, actDetailsMap]);

  const provisionNameMap = useMemo(() => {
    const m = {};
    (allProvisions || []).forEach((p) => { m[p.id] = p.name || p.short_code || p.id; });
    Object.entries(provisionDetailsMap).forEach(([id, p]) => {
      if (!m[id]) m[id] = p.name || p.short_code || p.id;
    });
    return m;
  }, [allProvisions, provisionDetailsMap]);

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
  const actLabel = (val) => {
    if (!val) return '';
    const id = typeof val === 'string' ? val : (val?.id || '');
    const resolved = actNameMap[id] || actDetailsMap[id]?.title || actDetailsMap[id]?.name || actDetailsMap[id]?.short_code
      || (typeof val === 'string' ? (looksLikeId(val) ? '' : val) : (val?.name || val?.title || val?.short_code || ''));
    return resolved || 'Unknown Act';
  };
  const provisionLabel = (val) => {
    if (!val) return '';
    if (typeof val !== 'string') {
      return val?.name || val?.title || val?.short_code || 'Unknown Section';
    }
    if (provisionNameMap[val]) return provisionNameMap[val];
    if (looksLikeId(val)) return 'Unknown Section';
    return val;
  };
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
      .then(() => navigate('/judgment-library'))
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
      .flatMap(c => String(c).split(/[,;]/).map(s => s.trim()))
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
      .then(() => navigate('/judgment-library'))
      .catch(() => {});
  };

  const classification = useMemo(() => {
    if (!judgment) return [];
    const rows = [];
    if (judgment.practiceArea) rows.push({ key: 'Area of Law', val: areaOfLawLabel(judgment.practiceArea) });
    if (judgment.typeOfProceeding) rows.push({ key: 'Type of Proceeding', val: typeOfProceedingLabel(judgment.typeOfProceeding) });
    if (judgment.natureOfDispute) rows.push({ key: 'Nature of Dispute', val: natureOfDisputeLabel(judgment.natureOfDispute) });
    if (judgment.caseType) rows.push({ key: 'Case Type', val: caseTypeLabel(judgment.caseType) });
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
          <Button variant="ghost" icon="chevronLeft" className="mt-4" onClick={() => navigate('/judgment-library')}>
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
    source, sourceUrl,
  } = judgment;

  const benchText = benchLabel(judgment.bench) || judgeLabel(judgment.judge) || judgeLabel(judgment.judges);
  const judgeText = judgeLabel(judgment.judge) || judgeLabel(judgment.judges);

  const partyA = appellant || petitioner || plaintiff || '';
  const partyB = respondent || respondentName || defendant || '';
  const partyAType = appellant ? 'Appellant' : petitioner ? 'Petitioner' : plaintiff ? (partyTypeLabel(plaintiffType) || 'Plaintiff') : '';
  const partyBType = respondent ? 'Respondent' : defendant ? (partyTypeLabel(defendantType) || 'Defendant') : '';

  const citationList = [citation, neutralCitation, reporterCitation]
    .filter(Boolean)
    .flatMap(c => String(c).split(/[,;]/).map(s => s.trim()))
    .filter(Boolean);

  return (
    <div className="jd-page">
      <button className="jd-back-link" onClick={() => navigate('/judgment-library')}>
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
              {reporterCitation && <span className="jd-cit-chip jd-cit-chip--muted">{reporterCitation}</span>}
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
                {/* Headnotes Section (Readonly) */}
                <div className="jd-prose-card">
                  <h3 className="jd-panel-title"><Icon name="doc" size={20} className="jd-panel-title-icon" /> Headnotes</h3>
                  {judgment.headnotes ? (
                    <div className="jd-prose jd-prose--readonly jd-judgment-reader">
                      <span dangerouslySetInnerHTML={{ __html: judgment.headnotes }} />
                    </div>
                  ) : (
                    <div className="jd-judgment-empty">
                      <div className="jd-judgment-empty-ill"><Icon name="doclines" size={56} /></div>
                      <div className="jd-judgment-empty-title">No Headnotes Available</div>
                      <div className="jd-judgment-empty-sub">This judgment does not yet contain any headnotes.</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'legalPrinciples' && (
              <div className="jd-panel-section">
                {/* Section 1 — Judgment Dates */}
                <h3 className="jd-panel-title"><Icon name="calendar" size={20} className="jd-panel-title-icon" /> Judgment Dates</h3>
                <div className="jd-dates-row">
                  <div className="jd-date-card jd-date-card--blue">
                    <div className="jd-date-card-icon-col">
                      <div className="jd-date-card-icon"><Icon name="calendar" size={20} /></div>
                    </div>
                    <div className="jd-date-card-body">
                      <span className="jd-date-label">Judgment Date <span className="jd-req">*</span></span>
                      <span className="jd-date-value">{judgment.judgmentDate ? formatDate(judgment.judgmentDate) : '—'}</span>
                    </div>
                  </div>
                  <div className="jd-date-card jd-date-card--green">
                    <div className="jd-date-card-icon-col">
                      <div className="jd-date-card-icon"><Icon name="check-circle" size={20} /></div>
                    </div>
                    <div className="jd-date-card-body">
                      <span className="jd-date-label">Pronouncement Date</span>
                      <span className="jd-date-value">{judgment.pronouncementDate ? formatDate(judgment.pronouncementDate) : '—'}</span>
                    </div>
                  </div>
                  <div className="jd-date-card jd-date-card--purple">
                    <div className="jd-date-card-icon-col">
                      <div className="jd-date-card-icon"><Icon name="upload" size={20} /></div>
                    </div>
                    <div className="jd-date-card-body">
                      <span className="jd-date-label">Upload Date</span>
                      <span className="jd-date-value">{judgment.uploadDate ? formatDate(judgment.uploadDate) : '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Judgment Link / Source URL Section */}
                {judgment.sourceUrl && (
                  <div className="jd-panel-section-block jd-panel-title--mt">
                    <h3 className="jd-panel-title"><Icon name="link" size={20} className="jd-panel-title-icon" /> Judgment Link</h3>
                    <div className="jd-source-link-card">
                      <a
                        href={judgment.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="jd-source-link"
                        title={judgment.sourceUrl}
                      >
                        <span className="jd-source-link-text">{judgment.sourceUrl}</span>
                        <span className="jd-source-link-ext"><Icon name="arrow" size={16} /></span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Section 2 — Judgement */}
                <h3 className="jd-panel-title jd-panel-title--mt"><Icon name="doc" size={20} className="jd-panel-title-icon" /> Judgement</h3>
                {(judgment.summary || judgment.fullText) ? (
                  <div className="jd-prose-card">
                    <div className="jd-prose jd-prose--readonly jd-judgment-reader">
                      {judgment.summary
                        ? <span dangerouslySetInnerHTML={{ __html: judgment.summary }} />
                        : <span dangerouslySetInnerHTML={{ __html: judgment.fullText }} />}
                    </div>
                  </div>
                ) : (
                  <div className="jd-prose-card">
                    <div className="jd-judgment-empty">
                      <div className="jd-judgment-empty-ill"><Icon name="doclines" size={56} /></div>
                      <div className="jd-judgment-empty-title">No Judgment Text Available</div>
                      <div className="jd-judgment-empty-sub">This judgment does not yet contain the full judgment text.</div>
                    </div>
                  </div>
                )}
                {judgment.summary && judgment.fullText && judgment.fullText !== judgment.summary && (
                  <>
                    <h3 className="jd-panel-title jd-panel-title--mt"><Icon name="doc" size={20} className="jd-panel-title-icon" /> Full Judgment Text</h3>
                    <div className="jd-prose-card">
                      <div className="jd-prose jd-prose--readonly jd-judgment-reader">
                        <span dangerouslySetInnerHTML={{ __html: judgment.fullText }} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'applicability' && (
              <div className="jd-panel-section">
                {/* Section 1 — Applicable Stage */}
                <h3 className="jd-panel-title">Applicable Stage</h3>
                <div className="jd-tags jd-tags--readonly">
                  {toArr(judgment.applicableStages).length ? (
                    toArr(judgment.applicableStages).map((stage, i) => {
                      const resolved = stageLabel(stage);
                      return <span key={i} className="jd-tag">{resolved || '—'}</span>;
                    })
                  ) : (
                    <div className="jd-prose jd-empty-text">No applicable stages specified.</div>
                  )}
                </div>

                {/* Section 2 — Legal Principle */}
                <h3 className="jd-panel-title jd-panel-title--mt">Legal Principle</h3>
                <div className="jd-prose-card">
                  <div className="jd-prose jd-prose--readonly">
                    {judgment.legalPrinciple
                      ? <span dangerouslySetInnerHTML={{ __html: judgment.legalPrinciple }} />
                      : 'No legal principle recorded for this judgment.'}
                  </div>
                </div>

                {/* Section 3 — Usage Notes */}
                <h3 className="jd-panel-title jd-panel-title--mt">Usage Notes</h3>
                <div className="jd-prose-card">
                  <div className="jd-prose jd-prose--readonly">
                    {judgment.usageNotes
                      ? <span dangerouslySetInnerHTML={{ __html: judgment.usageNotes }} />
                      : 'No usage notes recorded for this judgment.'}
                  </div>
                </div>
              </div>
            )}

            {tab === 'acts' && (
              <div className="jd-panel-section">
                {/* Section 1 — Legal References (2-column) */}
                <h3 className="jd-panel-title">Legal References</h3>
                <div className="jd-refs-grid">
                  <div className="jd-ref-item">
                    <span className="jd-ref-label">Area of Law</span>
                    <div className="jd-tags jd-tags--readonly">
                      {judgment.practiceArea ? <span className="jd-tag">{areaOfLawLabel(judgment.practiceArea)}</span> : <span className="jd-ref-empty">—</span>}
                    </div>
                  </div>
                  <div className="jd-ref-item">
                    <span className="jd-ref-label">Type of Proceeding</span>
                    <div className="jd-tags jd-tags--readonly">
                      {judgment.typeOfProceeding ? <span className="jd-tag">{typeOfProceedingLabel(judgment.typeOfProceeding)}</span> : <span className="jd-ref-empty">—</span>}
                    </div>
                  </div>
                  <div className="jd-ref-item">
                    <span className="jd-ref-label">Nature of Dispute</span>
                    <div className="jd-tags jd-tags--readonly">
                      {judgment.natureOfDispute ? <span className="jd-tag">{natureOfDisputeLabel(judgment.natureOfDispute)}</span> : <span className="jd-ref-empty">—</span>}
                    </div>
                  </div>
                  <div className="jd-ref-item">
                    <span className="jd-ref-label">Act</span>
                    <div className="jd-tags jd-tags--readonly">
                      {acts?.length ? acts.map((act, i) => {
                        const name = actLabel(act);
                        return <span key={i} className="jd-tag">{name || '—'}</span>;
                      }) : (
                        judgment.act ? <span className="jd-tag">{actLabel(judgment.act) || '—'}</span> : <span className="jd-ref-empty">—</span>
                      )}
                    </div>
                  </div>
                  <div className="jd-ref-item">
                    <span className="jd-ref-label">Provision(s)</span>
                    <div className="jd-tags jd-tags--readonly">
                      {toArr(judgment.provisions).length ? toArr(judgment.provisions).map((p, i) => <span key={i} className="jd-tag">{provisionLabel(p)}</span>) : <span className="jd-ref-empty">—</span>}
                    </div>
                  </div>
                  <div className="jd-ref-item">
                    <span className="jd-ref-label">Legal Issue</span>
                    <div className="jd-tags jd-tags--readonly">
                      {toArr(judgment.legalIssue).length ? toArr(judgment.legalIssue).map((item, i) => <span key={i} className="jd-tag">{item}</span>) : <span className="jd-ref-empty">—</span>}
                    </div>
                  </div>
                </div>

                {(source || sourceUrl) && (
                  <>
                    <h3 className="jd-panel-title jd-panel-title--mt">Judgment Source</h3>
                    <div className="jd-refs-grid">
                      {source && (
                        <div className="jd-ref-item">
                          <span className="jd-ref-label">Source</span>
                          <div className="jd-tags jd-tags--readonly">
                            <span className="jd-tag">{source}</span>
                          </div>
                        </div>
                      )}
                      {sourceUrl && (
                        <div className="jd-ref-item">
                          <span className="jd-ref-label">Source URL</span>
                          <div className="jd-tags jd-tags--readonly">
                            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="jd-source-link" style={{ fontSize: 13 }}>{sourceUrl}</a>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {citationList.length > 0 && (
                  <>
                    <h3 className="jd-panel-title jd-panel-title--mt">Citations</h3>
                    <div className="jd-refs-grid">
                      <div className="jd-ref-item" style={{ gridColumn: '1 / -1' }}>
                        <div className="jd-tags jd-tags--readonly">
                          {citationList.map((c, i) => <span key={i} className={`jd-tag jd-cit-pill jd-cit-pill--c${i % 6}`}>{c}</span>)}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <h3 className="jd-panel-title jd-panel-title--mt">Keywords</h3>
                <div className="jd-refs-grid">
                  <div className="jd-ref-item" style={{ gridColumn: '1 / -1' }}>
                    <div className="jd-tags jd-tags--readonly">
                      {toArr(judgment.keywords).length ? toArr(judgment.keywords).map((tag, i) => <span key={i} className="jd-tag">{tag}</span>) : <span className="jd-ref-empty">—</span>}
                    </div>
                  </div>
                </div>

                <h3 className="jd-panel-title jd-panel-title--mt">Tags</h3>
                <div className="jd-refs-grid">
                  <div className="jd-ref-item" style={{ gridColumn: '1 / -1' }}>
                    <div className="jd-tags jd-tags--readonly">
                      {toArr(judgment.tags).length ? toArr(judgment.tags).map((tag, i) => <span key={i} className="jd-tag">{tag}</span>) : <span className="jd-ref-empty">—</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'legalAnalysis' && (
              <div className="jd-panel-section">
                {/* Judicial Analysis */}
                <h3 className="jd-panel-title">Judicial Analysis</h3>

                {/* Section 1 — Ratio Decidendi */}
                <h3 className="jd-panel-title jd-panel-title--sub">Ratio Decidendi</h3>
                <div className="jd-prose-card">
                  <div className="jd-prose jd-prose--readonly">
                    {judgment.ratioDecidendi
                      ? <span dangerouslySetInnerHTML={{ __html: judgment.ratioDecidendi }} />
                      : 'No ratio decidendi recorded for this judgment.'}
                  </div>
                </div>

                {/* Section 2 — Obiter Dicta */}
                <h3 className="jd-panel-title jd-panel-title--sub jd-panel-title--mt">Obiter Dicta</h3>
                <div className="jd-prose-card">
                  <div className="jd-prose jd-prose--readonly">
                    {judgment.obiterDicta
                      ? <span dangerouslySetInnerHTML={{ __html: judgment.obiterDicta }} />
                      : 'No obiter dicta recorded for this judgment.'}
                  </div>
                </div>

                {/* Section 3 — Key Legal Findings */}
                <h3 className="jd-panel-title jd-panel-title--sub jd-panel-title--mt">Key Legal Findings</h3>
                <div className="jd-prose-card">
                  <div className="jd-prose jd-prose--readonly">
                    {judgment.keyFindings
                      ? <span dangerouslySetInnerHTML={{ __html: judgment.keyFindings }} />
                      : 'No key legal findings recorded for this judgment.'}
                  </div>
                </div>
              </div>
            )}

            {tab === 'documents' && (
              <div className="jd-panel-section">
                {/* Section 1 — Documents */}
                <h3 className="jd-panel-title">Documents</h3>
                {documents?.length ? documents.map((doc, i) => <DocRow key={i} doc={doc} />) : (
                  <div className="jd-prose jd-empty-text">No documents attached.</div>
                )}

                {/* Section 2 — Annexures */}
                <h3 className="jd-panel-title jd-panel-title--mt">Annexures</h3>
                {toArr(judgment.annexures).length ? toArr(judgment.annexures).map((doc, i) => <DocRow key={i} doc={doc} />) : (
                  <div className="jd-prose jd-empty-text">No annexures attached.</div>
                )}

                {/* Section 3 — Supporting Documents */}
                <h3 className="jd-panel-title jd-panel-title--mt">Supporting Documents</h3>
                {toArr(judgment.supportingDocuments).length ? toArr(judgment.supportingDocuments).map((doc, i) => <DocRow key={i} doc={doc} />) : (
                  <div className="jd-prose jd-empty-text">No supporting documents attached.</div>
                )}

                {/* Section 4 — External References */}
                <h3 className="jd-panel-title jd-panel-title--mt">External References</h3>
                {toArr(judgment.externalReferences).length ? (
                  <div className="jd-tags jd-tags--readonly">
                    {toArr(judgment.externalReferences).map((ref, i) => {
                      const url = typeof ref === 'string' ? ref : ref?.url || ref?.name || '';
                      return (
                        <a key={i} className="jd-tag jd-ext-ref" href={url} target="_blank" rel="noopener noreferrer">
                          {typeof ref === 'string' ? ref : (ref?.name || ref?.url || ref)}
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="jd-prose jd-empty-text">No external references added.</div>
                )}
              </div>
            )}

            {tab === 'notes' && (
              <div className="jd-panel-section">
                {/* Section 1 — Personal Notes */}
                <h3 className="jd-panel-title">Personal Notes</h3>
                <div className="jd-prose-card">
                  <div className="jd-prose jd-prose--readonly">
                    {judgment.notes ? judgment.notes : 'No personal notes recorded for this judgment.'}
                  </div>
                </div>

                {/* Section 2 — Research Notes */}
                <h3 className="jd-panel-title jd-panel-title--mt">Research Notes</h3>
                <div className="jd-prose-card">
                  <div className="jd-prose jd-prose--readonly">
                    {judgment.researchNotes ? judgment.researchNotes : 'No research notes recorded for this judgment.'}
                  </div>
                </div>
              </div>
            )}

            {tab === 'history' && (
              <div className="jd-panel-section">
                {/* Section 1 — Audit History (2-column) */}
                <h3 className="jd-panel-title">Audit History</h3>
                <div className="jd-refs-grid">
                  <div className="jd-ref-item">
                    <span className="jd-ref-label">Created By</span>
                    <span className="jd-ref-value">{judgment.createdBy || '—'}</span>
                  </div>
                  <div className="jd-ref-item">
                    <span className="jd-ref-label">Created On</span>
                    <span className="jd-ref-value">{judgment.createdAt ? formatDate(judgment.createdAt) : '—'}</span>
                  </div>
                  <div className="jd-ref-item">
                    <span className="jd-ref-label">Last Modified By</span>
                    <span className="jd-ref-value">{judgment.modifiedBy || '—'}</span>
                  </div>
                  <div className="jd-ref-item">
                    <span className="jd-ref-label">Last Modified On</span>
                    <span className="jd-ref-value">{judgment.updatedAt ? formatDate(judgment.updatedAt) : '—'}</span>
                  </div>
                </div>

                {/* Section 2 — Logs (2-column) */}
                <h3 className="jd-panel-title jd-panel-title--mt">Logs</h3>
                <div className="jd-refs-grid">
                  <div className="jd-ref-item">
                    <span className="jd-ref-label">Version History</span>
                    {toArr(judgment.versionHistory).length ? (
                      <div className="jd-log-list">
                        {toArr(judgment.versionHistory).map((v, i) => (
                          <div key={i} className="jd-log-item">{typeof v === 'string' ? v : (v?.label || v?.version || JSON.stringify(v))}</div>
                        ))}
                      </div>
                    ) : <span className="jd-ref-empty">—</span>}
                  </div>
                  <div className="jd-ref-item">
                    <span className="jd-ref-label">Change Log</span>
                    {toArr(judgment.changeLog).length ? (
                      <div className="jd-log-list">
                        {toArr(judgment.changeLog).map((c, i) => (
                          <div key={i} className="jd-log-item">{typeof c === 'string' ? c : (c?.label || c?.message || JSON.stringify(c))}</div>
                        ))}
                      </div>
                    ) : <span className="jd-ref-empty">—</span>}
                  </div>
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
            </div>
          </div>

          {tags.length > 0 && (
            <div className="jd-rc-card">
              <div className="jd-rc-title"><Icon name="search" size={14} /> Keywords</div>
              <div className="jd-rc-body">
                <div className="jd-tags">
                  {tags.map((tag, i) => <span key={i} className="jd-tag">{tag}</span>)}
                </div>
              </div>
            </div>
          )}

          {judgment.legalIssue?.length > 0 && (
            <div className="jd-rc-card">
              <div className="jd-rc-title"><Icon name="book" size={14} /> Legal Issue</div>
              <div className="jd-rc-body">
                <div className="jd-tags">
                  {toArr(judgment.legalIssue).map((item, i) => <span key={i} className="jd-tag">{item}</span>)}
                </div>
              </div>
            </div>
          )}

          <div className="jd-rc-card">
            <div className="jd-rc-title"><Icon name="file" size={14} /> Acts & Sections</div>
            <div className="jd-rc-body">
              {(acts?.length || judgment.provisions?.length) ? (
                <ActsSectionsGroup
                  acts={acts?.length ? acts : (judgment.act ? [judgment.act] : [])}
                  provisions={toArr(judgment.provisions)}
                  actLabel={actLabel}
                  provisionLabel={provisionLabel}
                />
              ) : <div className="jd-empty-text">No acts referenced.</div>}
            </div>
          </div>

          <div className="jd-rc-card">
            <div className="jd-rc-title"><Icon name="info" size={14} /> Quick Info</div>
            <div className="jd-rc-body">
              <div className="jd-rc-row"><span className="jd-rc-key">Status</span><span className="jd-rc-val">{status || 'Active'}</span></div>
              <div className="jd-rc-row"><span className="jd-rc-key">Upload Date</span><span className="jd-rc-val">{judgment.uploadDate ? formatDate(judgment.uploadDate) : '—'}</span></div>
              <div className="jd-rc-row"><span className="jd-rc-key">Last Updated</span><span className="jd-rc-val">{judgment.updatedAt ? formatDate(judgment.updatedAt) : '—'}</span></div>
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

      <div className="jd-related-full">
        <div className="jd-related-section">
          <div className="jd-related-head">
            <div>
              <h2 className="jd-related-title"><Icon name="balance" size={20} className="jd-related-title-icon" /> Related Judgments</h2>
              <p className="jd-related-subtitle">Discover similar precedents related to this judgment.</p>
            </div>
            <button className="jd-related-viewall" onClick={() => navigate('/judgment-library')}>
              View All <Icon name="arrow" size={15} />
            </button>
          </div>

          {loading ? (
            <div className="jd-related-slider-wrap">
              <div className="jd-rel-slider">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rjc-skeleton">
                    <div className="rjc-skel-badge" />
                    <div className="rjc-skel-title" />
                    <div className="rjc-skel-citation" />
                    <div className="rjc-skel-meta">
                      <div className="rjc-skel-meta-col">
                        <div className="rjc-skel-meta-label" />
                        <div className="rjc-skel-meta-value" />
                      </div>
                      <div className="rjc-skel-meta-col">
                        <div className="rjc-skel-meta-label" />
                        <div className="rjc-skel-meta-value" />
                      </div>
                    </div>
                    <div className="rjc-skel-divider" />
                    <div className="rjc-skel-summary" />
                    <div className="rjc-skel-tags">
                      <div className="rjc-skel-tag" />
                      <div className="rjc-skel-tag" />
                      <div className="rjc-skel-tag" />
                    </div>
                    <div className="rjc-skel-divider" />
                    <div className="rjc-skel-footer">
                      <div className="rjc-skel-relevance" />
                      <div className="rjc-skel-cta" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : related.length > 0 ? (
            <div className="jd-related-slider-wrap">
              <button
                className="jd-rel-arrow jd-rel-arrow--left"
                onClick={() => scrollRelated(-1)}
                disabled={sliderAtStart}
                aria-label="Previous related judgments"
              >
                <Icon name="chevronLeft" size={20} />
              </button>
              <div
                className="jd-rel-slider"
                ref={relatedSliderRef}
                onScroll={updateSliderButtons}
              >
                {related.map((r) => (
                  <RelatedJudgmentCard
                    key={r.id}
                    judgment={r}
                    getCourtLabel={courtLabel}
                    onView={(j) => navigate(`/judgment-library/${j.id}`)}
                  />
                ))}
              </div>
              <button
                className="jd-rel-arrow jd-rel-arrow--right"
                onClick={() => scrollRelated(1)}
                disabled={sliderAtEnd}
                aria-label="Next related judgments"
              >
                <Icon name="chevron" size={20} />
              </button>
            </div>
          ) : (
            <div className="rjc-empty">
              <div className="rjc-empty-icon"><Icon name="courthouse" /></div>
              <div className="rjc-empty-title">No Related Judgments</div>
              <div className="rjc-empty-sub">No similar precedents are linked to this judgment.</div>
              <button className="rjc-empty-btn" onClick={() => navigate('/judgment-library')}>
                <Icon name="book" size={16} /> Browse Judgment Library
              </button>
            </div>
          )}
        </div>
      </div>

      {judgment.casesCited?.length > 0 && (
        <div className="jd-cases-cited-full">
          <div className="jd-rc-card jd-citation-card">
            <div className="jd-rc-title"><Icon name="link" size={14} /> Cases Cited in this case</div>
            <div className="jd-rc-body jd-citation-body">
              {toArr(judgment.casesCited).map((c, i) => <span key={i} className={`jd-cit-pill jd-cit-pill--c${i % 6}`}>{c}</span>)}
            </div>
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

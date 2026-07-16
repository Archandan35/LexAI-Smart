import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';
import Spinner from '@/components/Spinner.jsx';
import { judgmentsRepository } from '@/data-layer/repositories/judgmentsRepository.js';
import { courtsRepository } from '@/data-layer/repositories/courtsRepository.js';
import { benchTypesRepository } from '@/data-layer/repositories/benchTypesRepository.js';
import { judgesRepository } from '@/data-layer/repositories/judgesRepository.js';
import { useFormat } from '@/utils/format.js';
import AddJudgmentModal from './AddJudgmentModal.jsx';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'legalPrinciples', label: 'Legal Principles' },
  { key: 'acts', label: 'Acts & Sections' },
  { key: 'applicability', label: 'Applicability' },
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

  const [courts, setCourts] = useState([]);
  const [benchTypes, setBenchTypes] = useState([]);
  const [judges, setJudges] = useState([]);

  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    judgmentsRepository.getById(id)
      .then((data) => {
        if (cancelled) return;
        setJudgment(data || null);
        setFavourite(data?.favourite || data?.favorited || false);
      })
      .catch(() => { if (!cancelled) setJudgment(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    judgmentsRepository.getAll()
      .then((data) => { if (!cancelled) setAllJudgments(data || []); })
      .catch(() => {});
    courtsRepository.getAll().then(setCourts).catch(() => {});
    benchTypesRepository.getAll().then(setBenchTypes).catch(() => {});
    judgesRepository.getAll().then(setJudges).catch(() => {});
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
    return { court: build(courts), bench: build(benchTypes), judge: build(judges) };
  }, [courts, benchTypes, judges]);

  const judgeLabel = (val) => {
    if (!val) return '';
    if (Array.isArray(val)) return val.map((v) => nameMap.judge[v] || v).join(', ');
    return nameMap.judge[val] || val;
  };
  const courtLabel = (val) => (val ? (nameMap.court[val] || val) : '');
  const benchLabel = (val) => (val ? (nameMap.bench[val] || nameMap.judge[val] || val) : '');

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

  const handleNotify = () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification('Judgment reminder set', { body: judgment?.title || judgment?.citation || '' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') new Notification('Judgment reminder set', { body: judgment?.title || judgment?.citation || '' });
      }).catch(() => {});
    }
  };

  const handleCopyCitation = () => {
    if (judgment?.citation && navigator.clipboard) {
      navigator.clipboard.writeText(judgment.citation).catch(() => {});
    }
  };

  const classification = useMemo(() => {
    if (!judgment) return [];
    const rows = [];
    if (judgment.subjectMatter) rows.push({ key: 'Matter Type', val: judgment.subjectMatter });
    if (judgment.practiceArea) rows.push({ key: 'Practice Area', val: judgment.practiceArea });
    if (judgment.category) rows.push({ key: 'Category', val: judgment.category });
    if (judgment.caseType) rows.push({ key: 'Subject', val: judgment.caseType });
    return rows;
  }, [judgment]);

  const tags = useMemo(() => judgment?.keywords || [], [judgment]);

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
  const partyAType = appellant ? 'Appellant' : petitioner ? 'Petitioner' : plaintiff ? (plaintiffType || 'Plaintiff') : '';
  const partyBType = respondent ? 'Respondent' : defendant ? (defendantType || 'Defendant') : '';

  const citationList = [citation, neutralCitation, reporterCitation].filter(Boolean);

  return (
    <div className="jd-page">
      <button className="jd-back-link" onClick={() => navigate('/research/judgment-library')}>
        <Icon name="chevronLeft" size={16} />
        Back to Judgments
      </button>

      <div className="jd-toolbar">
        <button className="jd-tool-btn" onClick={() => setShowEditModal(true)}><Icon name="pen" size={13} /> Edit</button>
        <button className="jd-tool-btn jd-tool-btn--icon" title="Duplicate" onClick={handleDuplicate}><Icon name="copy" size={14} /></button>
        <button
          className={`jd-tool-btn jd-tool-btn--icon${favourite ? ' jd-tool-btn--active' : ''}`}
          title="Favourite"
          onClick={() => setFavourite(!favourite)}
        >
          <Icon name="heart" size={14} />
        </button>
        <button className="jd-tool-btn jd-tool-btn--icon" title="Pin" onClick={handleNotify}><Icon name="pin" size={14} /></button>
        <div className="jd-tool-divider" />
        <button className="jd-tool-btn jd-tool-btn--icon" title="Share" onClick={handleShare}><Icon name="share" size={14} /></button>
        <button className="jd-tool-btn jd-tool-btn--icon" title="Print" onClick={() => window.print()}><Icon name="print" size={14} /></button>
        <button className="jd-tool-btn jd-tool-btn--icon" title="Download" onClick={handleShare}><Icon name="download" size={14} /></button>
        <div className="jd-tool-divider" />
        <button className="jd-tool-btn" onClick={handleCopyCitation}><Icon name="copy" size={13} /> Copy Citation</button>
        <button className="jd-tool-btn jd-tool-btn--icon" title="More"><Icon name="more-horizontal" size={14} /></button>
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
          <MetaItem icon="building" tone="purple" label="Court" value={courtLabel(court)} />
          <MetaItem icon="balance" tone="blue" label="Bench" value={benchText} />
          <MetaItem icon="user" tone="green" label="Judge(s)" value={judgeText} />
          <MetaItem icon="calendar" tone="orange" label="Judgment Date" value={date ? formatDate(date) : ''} />
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
        <div className="jd-main-col">
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
              <div className="jd-panel-section">
                <h3 className="jd-panel-title">Headnote</h3>
                <div className="jd-prose">
                  {summary || (paragraphs?.length ? paragraphs.join('\n\n') : 'No summary available for this judgment.')}
                </div>
              </div>
            )}

            {tab === 'legalPrinciples' && (
              <div className="jd-panel-section">
                <h3 className="jd-panel-title">Legal Principle</h3>
                <div className="jd-prose">{summary || 'No legal principles recorded for this judgment.'}</div>
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
                {acts?.length ? acts.map((act, i) => <ActRow key={i} act={act} />) : (
                  <div className="jd-prose jd-empty-text">No acts referenced.</div>
                )}
                {judgment.act && !acts?.length && (
                  <div className="jd-prose jd-empty-text">{judgment.act}</div>
                )}
              </div>
            )}

            {tab === 'applicability' && (
              <div className="jd-panel-section">
                <h3 className="jd-panel-title">Applicability</h3>
                <div className="jd-prose">
                  {judgment.applicability || (judgment.precedentialValue
                    ? `Precedential value: ${judgment.precedentialValue}.`
                    : 'No applicability notes recorded.')}
                </div>
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

        <div className="jd-side-col">
          <div className="jd-rc-card">
            <div className="jd-rc-title"><Icon name="tag" size={14} /> Legal Classification</div>
            <div className="jd-rc-body">
              {classification.length ? classification.map((row, i) => (
                <div key={i} className="jd-rc-row">
                  <span className="jd-rc-key">{row.key}</span>
                  <span className="jd-rc-val">{row.val}</span>
                </div>
              )) : <div className="jd-empty-text">No classification data.</div>}
              {tags.length > 0 && (
                <div className="jd-tags">
                  {tags.map((tag, i) => <span key={i} className="jd-tag">{tag}</span>)}
                </div>
              )}
            </div>
          </div>

          <div className="jd-rc-card">
            <div className="jd-rc-title"><Icon name="file" size={14} /> Acts & Sections</div>
            <div className="jd-rc-body">
              {acts?.length ? acts.map((act, i) => <ActRow key={i} act={act} />) : (
                judgment.act ? <div className="jd-empty-text">{judgment.act}</div> : <div className="jd-empty-text">No acts referenced.</div>
              )}
            </div>
          </div>

          <div className="jd-rc-card">
            <div className="jd-rc-title"><Icon name="info" size={14} /> Quick Info</div>
            <div className="jd-rc-body">
              <div className="jd-rc-row"><span className="jd-rc-key">Judgment Type</span><span className="jd-rc-val">{judgment.judgmentType || '—'}</span></div>
              <div className="jd-rc-row"><span className="jd-rc-key">Authority</span><span className="jd-rc-val">{judgment.authorityLevel || '—'}</span></div>
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

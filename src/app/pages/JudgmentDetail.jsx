import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import Badge from '@/components/Badge.jsx';
import Spinner from '@/components/Spinner.jsx';
import { judgmentsRepository } from '@/data-layer/repositories/judgmentsRepository.js';
import { courtsRepository } from '@/data-layer/repositories/courtsRepository.js';
import { benchTypesRepository } from '@/data-layer/repositories/benchTypesRepository.js';
import { judgesRepository } from '@/data-layer/repositories/judgesRepository.js';
import { useFormat } from '@/utils/format.js';

const TABS = [
  { key: 'sections', label: 'Sections / Summary' },
  { key: 'citations', label: 'Citations' },
  { key: 'bench', label: 'Bench' },
  { key: 'hearing', label: 'Hearing' },
  { key: 'orders', label: 'Orders' },
  { key: 'history', label: 'History' },
];

function StatusBadge({ status }) {
  if (!status) return null;
  const cls = `jd-status-badge jd-status-badge--${status.toLowerCase()}`;
  return <span className={cls}>{status}</span>;
}

function MetaItem({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="jd-meta-item">
      <div className="jd-meta-item__icon"><Icon name={icon} size={16} /></div>
      <div>
        <div className="jd-meta-item__label">{label}</div>
        <div className="jd-meta-item__value">{value}</div>
      </div>
    </div>
  );
}

function ActRow({ act }) {
  const name = typeof act === 'string' ? act : act?.name || act?.act || '';
  const section = typeof act === 'string' ? '' : act?.section || '';
  return (
    <div className="jd-act-row">
      <Icon name="file" size={14} />
      <span className="jd-act-row__name">{name}</span>
      {section && <span className="jd-act-row__section">(Section {section})</span>}
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
        <div className="jd-doc-info__name">{name}</div>
        {size && <div className="jd-doc-info__size">{size}</div>}
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
  const [tab, setTab] = useState('sections');
  const [favourite, setFavourite] = useState(false);

  const [courts, setCourts] = useState([]);
  const [benchTypes, setBenchTypes] = useState([]);
  const [judges, setJudges] = useState([]);

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

  // Resolve a single id or an array of ids to display names (falls back to the raw value).
  const judgeLabel = (val) => {
    if (!val) return '';
    if (Array.isArray(val)) return val.map((v) => nameMap.judge[v] || v).join(', ');
    return nameMap.judge[val] || val;
  };
  const courtLabel = (val) => (val ? (nameMap.court[val] || val) : '');
  const benchLabel = (val) => (val ? (nameMap.bench[val] || val) : '');

  const classification = useMemo(() => {
    if (!judgment) return [];
    const rows = [];
    if (judgment.court) rows.push({ key: 'Court Level', val: courtLabel(judgment.court) });
    if (judgment.type) rows.push({ key: 'Type', val: judgment.type });
    if (judgment.matterType) rows.push({ key: 'Matter Type', val: judgment.matterType });
    if (judgment.bench) rows.push({ key: 'Bench', val: benchLabel(judgment.bench) });
    if (judgment.judge) rows.push({ key: 'Judge', val: judgeLabel(judgment.judge) });
    if (judgment.judges) rows.push({ key: 'Bench', val: judgeLabel(judgment.judges) });
    return rows;
  }, [judgment]);

  const tags = useMemo(() => {
    if (!judgment?.keywords?.length) return [];
    return judgment.keywords;
  }, [judgment]);

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
    title, citation, court, date, caseNumber, status,
    appellant, respondent, petitioner, respondentName,
    summary, paragraphs, acts, documents,
    citations, hearing, orders, history,
  } = judgment;

  const partyA = appellant || petitioner || '';
  const partyB = respondent || respondentName || '';

  return (
    <div className="jd-page">
      <button className="jd-back-link" onClick={() => navigate('/research/judgment-library')}>
        <Icon name="chevronLeft" size={16} />
        Back to Judgments
      </button>

      <div className="jd-toolbar">
        <button className="jd-toolbar-btn"><Icon name="pen" size={13} /> Edit</button>
        <button className="jd-toolbar-btn jd-toolbar-btn--icon"><Icon name="copy" size={14} /></button>
        <button
          className={`jd-toolbar-btn jd-toolbar-btn--icon${favourite ? ' jd-toolbar-btn--active' : ''}`}
          onClick={() => setFavourite(!favourite)}
        >
          <Icon name="heart" size={14} />
        </button>
        <button className="jd-toolbar-btn jd-toolbar-btn--icon"><Icon name="pin" size={14} /></button>
        <div className="jd-toolbar-divider" />
        <button className="jd-toolbar-btn jd-toolbar-btn--icon"><Icon name="share" size={14} /></button>
        <button className="jd-toolbar-btn jd-toolbar-btn--icon"><Icon name="print" size={14} /></button>
        <button className="jd-toolbar-btn jd-toolbar-btn--icon"><Icon name="download" size={14} /></button>
        <div className="jd-toolbar-divider" />
        <button className="jd-toolbar-btn"><Icon name="copy" size={13} /> Copy Citation</button>
        <button className="jd-toolbar-btn jd-toolbar-btn--icon"><Icon name="more-horizontal" size={14} /></button>
      </div>

      <div className="jd-case-card">
        <div className="jd-case-status-row">
          <StatusBadge status={status} />
          <button
            className={`jd-favourite-toggle${favourite ? ' jd-favourite-toggle--active' : ''}`}
            onClick={() => setFavourite(!favourite)}
          >
            <Icon name="heart" size={14} />
          </button>
        </div>

        <h1 className="jd-case-title">{title || citation || 'Untitled'}</h1>
        <div className="jd-case-citation">{citation}</div>

        <div className="jd-case-meta-grid">
          <MetaItem icon="building" label="Court" value={courtLabel(court)} />
          <MetaItem icon="users" label="Bench / Judge" value={benchLabel(judgment.bench) || judgeLabel(judgment.judge) || judgeLabel(judgment.judges)} />
          <MetaItem icon="user" label="Judge(s)" value={judgeLabel(judgment.judge) || judgeLabel(judgment.judges)} />
          <MetaItem icon="calendar" label="Judgment Date" value={date ? formatDate(date) : ''} />
        </div>

        {(partyA || partyB) && (
          <div className="jd-party-row">
            {partyA && (
              <div className="jd-party-block">
                <div className="jd-party-block__label">{appellant ? 'Appellant' : 'Petitioner'}</div>
                <div className="jd-party-block__name">{partyA}</div>
              </div>
            )}
            {partyB && (
              <div className="jd-party-block">
                <div className="jd-party-block__label">{respondent ? 'Respondent' : 'Respondent'}</div>
                <div className="jd-party-block__name">{partyB}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="jd-two-col">
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
            {tab === 'sections' && (
              <div>
                <h3 className="jd-section-title">Sections / Summary</h3>
                <div className="jd-summary-text">
                  {summary || (paragraphs?.length ? paragraphs.join('\n\n') : 'No summary available for this judgment.')}
                </div>
              </div>
            )}

            {tab === 'citations' && (
              <div>
                <h3 className="jd-section-title">Citations</h3>
                {citations?.length ? (
                  <ul className="jd-citation-list">
                    {citations.map((c, i) => (
                      <li key={i}><Icon name="link" size={14} /> {typeof c === 'string' ? c : c.name || c.citation || c}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="jd-summary-text">No citations listed.</div>
                )}
              </div>
            )}

            {tab === 'bench' && (
              <div>
                <h3 className="jd-section-title">Bench</h3>
                <div className="jd-summary-text">
                  {judgment.bench ? (
                    <>{benchLabel(judgment.bench)} — {judgeLabel(judgment.judge) || judgeLabel(judgment.judges)}</>
                  ) : (
                    judgeLabel(judgment.judge) || judgeLabel(judgment.judges) || 'Bench information not available.'
                  )}
                </div>
              </div>
            )}

            {tab === 'hearing' && (
              <div>
                <h3 className="jd-section-title">Hearing</h3>
                <div className="jd-summary-text">
                  {hearing || 'No hearing information available.'}
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <div>
                <h3 className="jd-section-title">Orders</h3>
                <div className="jd-summary-text">
                  {orders || 'No orders available for this judgment.'}
                </div>
              </div>
            )}

            {tab === 'history' && (
              <div>
                <h3 className="jd-section-title">History</h3>
                <div className="jd-summary-text">
                  {history || 'No history available for this judgment.'}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="jd-side-col">
          <div className="jd-rc-card">
            <div className="jd-rc-card__head">
              <span className="jd-rc-card__head-icon"><Icon name="tag" size={14} /></span>
              Legal Classification
            </div>
            <div className="jd-rc-card__body">
              {classification.length ? classification.map((row, i) => (
                <div key={i} className="jd-class-row">
                  <span className="jd-class-row__key">{row.key}</span>
                  <span className="jd-class-row__val">{row.val}</span>
                </div>
              )) : <div className="jd-summary-text jd-summary-empty">No classification data.</div>}
            </div>
          </div>

          <div className="jd-rc-card">
            <div className="jd-rc-card__head">
              <span className="jd-rc-card__head-icon"><Icon name="file" size={14} /></span>
              Acts & Sections
            </div>
            <div className="jd-rc-card__body">
              {acts?.length ? acts.map((act, i) => <ActRow key={i} act={act} />) : (
                <div className="jd-summary-text jd-summary-empty">No acts referenced.</div>
              )}
            </div>
          </div>

          {tags.length > 0 && (
            <div className="jd-rc-card">
              <div className="jd-rc-card__head">
                <span className="jd-rc-card__head-icon"><Icon name="tag" size={14} /></span>
                Quick Info
              </div>
              <div className="jd-rc-card__body">
                <div className="jd-tags">
                  {tags.map((tag, i) => <span key={i} className="jd-tag">{tag}</span>)}
                </div>
              </div>
            </div>
          )}

          <div className="jd-rc-card">
            <div className="jd-rc-card__head">
              <span className="jd-rc-card__head-icon"><Icon name="file" size={14} /></span>
              Documents
            </div>
            <div className="jd-rc-card__body">
              {documents?.length ? documents.map((doc, i) => <DocRow key={i} doc={doc} />) : (
                <div className="jd-summary-text jd-summary-empty">No documents attached.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="jd-related-section">
          <h3 className="jd-section-title jd-related-title">Related Judgments</h3>
          <div className="jd-related-grid">
            {related.map((r) => (
              <div key={r.id} className="jd-related-item" onClick={() => navigate(`/research/judgment-library/${r.id}`)}>
                <div className="jd-related-item__title">{r.title || r.citation}</div>
                <div className="jd-related-item__court">{r.court}</div>
                <div className="jd-related-item__footer">
                  <span className="jd-related-item__date">{r.date ? formatDate(r.date) : ''}</span>
                  <span className="jd-related-item__ref">{r.status || r.citation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

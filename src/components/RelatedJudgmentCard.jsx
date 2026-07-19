import Icon from './Icon.jsx';

function formatCitation(citation) {
  if (!citation) return '';
  return String(citation).split(/[,;]/).map((c) => c.trim()).filter(Boolean);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function toArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap((e) => {
    if (typeof e === 'string') { try { return JSON.parse(e); } catch { return e; } } return e;
  });
  if (typeof v === 'string') { try { const p = JSON.parse(v); if (Array.isArray(p)) return p; } catch {} return [v]; }
  return [];
}

function getStatus(judgment) {
  if (judgment.overruledBy) return 'Overruled';
  if (judgment.followedBy) return 'Followed';
  if (judgment.archived) return 'Archived';
  return 'Active';
}

export default function RelatedJudgmentCard({ judgment, onView }) {
  if (!judgment) return null;

  const status = getStatus(judgment);
  const statusKey = status.toLowerCase();
  const citations = formatCitation(judgment.citation);
  const courtName = judgment.court || '';
  const dateLabel = judgment.judgmentDate || judgment.date || '';
  const formattedDate = formatDate(dateLabel);
  const summary = judgment.summary || judgment.headnotes || judgment.ratioDecidendi || '';
  const tags = toArr(judgment.tags).length ? toArr(judgment.tags) : toArr(judgment.keywords);
  const visibleTags = tags.slice(0, 3);
  const extraCount = tags.length - visibleTags.length;
  const relevance = judgment.relevance ?? null;

  const handleView = (e) => {
    e.stopPropagation();
    if (onView) onView(judgment);
  };

  return (
    <div className={`rjc-card rjc-card--${statusKey}`} onClick={handleView}>
      <div className="rjc-badge-wrapper">
        <span className={`rjc-badge rjc-badge--${statusKey}`}>{status}</span>
      </div>

      <div className="rjc-title">{judgment.title || judgment.citation || 'Untitled'}</div>

      {citations.length > 0 && (
        <div className="rjc-citation">
          {citations.map((c, i) => (
            <span key={i} className="rjc-citation-pill">{c}</span>
          ))}
        </div>
      )}

      <div className="rjc-meta">
        <div className="rjc-meta-col">
          <div className="rjc-meta-label-row">
            <Icon name="building2" size={14} />
            <span className="rjc-meta-label">Court</span>
          </div>
          <div className="rjc-meta-value">{courtName || '\u2014'}</div>
        </div>
        <div className="rjc-meta-col">
          <div className="rjc-meta-label-row">
            <Icon name="calendar" size={14} />
            <span className="rjc-meta-label">Judgment Date</span>
          </div>
          <div className="rjc-meta-value">{formattedDate || '\u2014'}</div>
        </div>
      </div>

      <div className="rjc-divider" />

      {summary && (
        <div className="rjc-summary">{summary}</div>
      )}

      {tags.length > 0 && (
        <div className="rjc-tags">
          {visibleTags.map((t, i) => (
            <span key={i} className="rjc-tag">{t}</span>
          ))}
          {extraCount > 0 && <span className="rjc-tag rjc-tag--more">+{extraCount}</span>}
        </div>
      )}

      <div className="rjc-divider" />

      <div className="rjc-footer">
        {relevance !== null && (
          <div className="rjc-relevance">
            {typeof relevance === 'number'
              ? <><span className="rjc-relevance-value">{relevance}</span><span className="rjc-relevance-pct">% Relevant</span></>
              : <span className="rjc-relevance-value">Highly Relevant</span>
            }
          </div>
        )}
        <button className="rjc-cta" onClick={handleView}>
          View Judgment <Icon name="arrow" size={14} />
        </button>
      </div>
    </div>
  );
}

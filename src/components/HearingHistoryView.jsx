import { useState, useMemo } from 'react';
import Icon from './Icon.jsx';
import Badge from './Badge.jsx';
import EmptyState from './EmptyState.jsx';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { stripHtml, useFormat } from '@/utils/format.js';

// HearingHistoryView — reusable hearing history view. Desktop shows the
// timeline/cards on the left beside an "Add Hearing" action (layout handled by
// the parent); mobile shows a full-width 50/50 Timeline/Cards toggle.
// Props:
//   hearings        : array of hearing records (id, date, status, purpose, notes, next_hearing_date, updated_at)
//   onEdit(hearing) : opens the hearing in the edit modal
//   onShare(hearing): optional share handler
//   getStatusStyle  : (status) => { bg, text, border, dot }  (colour tokens)
//   emptyTitle / emptyIcon
export default function HearingHistoryView({
  hearings = [],
  onEdit,
  onShare,
  onAdd,
  getStatusStyle,
  emptyTitle = 'No hearings recorded.',
  emptyIcon = 'calendar',
}) {
  const { formatDate, formatDateTime } = useFormat();
  const [sortDir, setSortDir] = useState('desc'); // desc = Recent
  const [view, setView] = useState('timeline'); // timeline | cards
  const [preview, setPreview] = useState(null);

  const styleFor = (status) => {
    if (getStatusStyle) return getStatusStyle(status);
    return { bg: '#f1f3f5', text: '#495057', border: '#dee2e6', dot: '#868e96' };
  };

  const sorted = useMemo(() => {
    const list = [...(hearings || [])];
    list.sort((a, b) => {
      const ta = new Date(a.updated_at || a.date).getTime();
      const tb = new Date(b.updated_at || b.date).getTime();
      return sortDir === 'desc' ? tb - ta : ta - tb;
    });
    return list;
  }, [hearings, sortDir]);

  const lastUpdated = (h) => (h.updated_at ? formatDateTime(h.updated_at) : formatDate(h.date));

  const renderCard = (h) => {
    const st = styleFor(h.status);
    return (
      <>
        <div className="hh-wire__card-head">
          <div className="hh-wire__date">
            <Icon name="calendar" size={14} />
            <span>{formatDate(h.date)}</span>
          </div>
          {h.status && (
            <span
              className="hh-wire__badge badge--dyn"
              style={{ '--bd-bg': st.bg, '--bd-color': st.text, '--bd-border': st.border }}
            >
              <span className="cl-card__badge-dot sync__dot--dyn" style={{ '--dot-bg': st.dot }} />
              {h.status}
            </span>
          )}
        </div>

        <div className="hh-wire__text">{stripHtml(h.notes) || 'No proceedings recorded.'}</div>

        <button className="hh-wire__readmore" onClick={() => setPreview(h)}>
          Read More <Icon name="chevron" size={13} />
        </button>

        <div className="hh-wire__foot">
          <div className="hh-wire__updated">
            <Icon name="clock" size={13} />
            <span>Last Updated: {lastUpdated(h)}</span>
          </div>
          <div className="hh-wire__foot-actions">
            {onEdit && (
              <button className="hh-wire__foot-btn" onClick={() => onEdit(h)}>
                <Icon name="edit" size={14} /> Edit
              </button>
            )}
            <button className="hh-wire__foot-btn" onClick={() => (onShare ? onShare(h) : setPreview(h))}>
              <Icon name="share" size={14} /> Share
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="hh-wire">
      {/* Single-row toolbar: Timeline/Cards toggle · Sort · Add Hearing */}
      <div className="hh-wire__bar">
        <div className="hh-seg">
          <button
            type="button"
            className={view === 'timeline' ? 'active' : ''}
            onClick={() => setView('timeline')}
          >
            <Icon name="activity" size={14} /> Timeline
          </button>
          <button
            type="button"
            className={view === 'cards' ? 'active' : ''}
            onClick={() => setView('cards')}
          >
            <Icon name="grid" size={14} /> Cards
          </button>
        </div>

        <div className="hh-wire__bar-right">
          <div className="hh-wire__sort">
            <span className="hh-wire__sort-label">Sort:</span>
            <div className="hh-wire__sort-select">
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="desc">Recent</option>
                <option value="asc">Oldest</option>
              </select>
              <Icon name="chevronDown" size={13} />
            </div>
          </div>
          {onAdd && (
            <Button size="sm" icon="plus" onClick={onAdd} className="hh-wire__add">Add Hearing</Button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} />
      ) : view === 'timeline' ? (
        <div className="hh-wire__list">
          {sorted.map((h, i) => {
            const st = styleFor(h.status);
            const isLast = i === sorted.length - 1;
            return (
              <div className="hh-wire__item" key={h.id || i}>
                <div className="hh-wire__rail">
                  <div
                    className="hh-wire__node"
                    style={{ borderColor: st.dot, color: st.dot }}
                  >
                    {h.status === 'Completed' ? <Icon name="check" size={13} /> : <Icon name="clock" size={13} />}
                  </div>
                  {!isLast && <div className="hh-wire__line" />}
                </div>
                <div className="hh-wire__card">{renderCard(h)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="hh-cards">
          {sorted.map((h, i) => (
            <div className="hh-cards__card" key={h.id || i}>{renderCard(h)}</div>
          ))}
        </div>
      )}

      {/* Read-only proceedings preview — shows only the text entered in the editor field */}
      {preview && (
        <Modal
          open
          title={`${preview.purpose || 'Hearing'} — ${formatDate(preview.date)}`}
          onClose={() => setPreview(null)}
          footer={(
            <>
              {onEdit && (
                <Button variant="ghost" onClick={() => { setPreview(null); onEdit(preview); }}>
                  Edit
                </Button>
              )}
              <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
            </>
          )}
        >
          <div className="hh-view__preview">
            {preview.status && (
              <div className="hh-view__preview-status">
                <Badge dot>{preview.status}</Badge>
              </div>
            )}
            <div className="hh-view__preview-text">
              {stripHtml(preview.notes) ? stripHtml(preview.notes) : 'No proceedings recorded.'}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

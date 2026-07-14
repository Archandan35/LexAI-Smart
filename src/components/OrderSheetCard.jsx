import Icon from './Icon.jsx';
import { useFormat } from '@/utils/format.js';

const STATUS_COLORS = [
  { bg: '#fce4ec', text: '#c62828', border: '#ef9a9a', dot: '#c62828' },
  { bg: '#fff4e6', text: '#e8590c', border: '#ffc078', dot: '#e8590c' },
  { bg: '#f4fce3', text: '#5c940d', border: '#c0eb75', dot: '#5c940d' },
  { bg: '#edf2ff', text: '#364fc7', border: '#bac8ff', dot: '#364fc7' },
  { bg: '#f3e5f5', text: '#7b1fa2', border: '#ce93d8', dot: '#7b1fa2' },
  { bg: '#e0f2f1', text: '#00695c', border: '#80cbc4', dot: '#00695c' },
  { bg: '#fff8e1', text: '#f57f17', border: '#ffe082', dot: '#f57f17' },
  { bg: '#fbe9e7', text: '#bf360c', border: '#ffab91', dot: '#bf360c' },
  { bg: '#e8eaf6', text: '#283593', border: '#9fa8da', dot: '#283593' },
  { bg: '#fafafa', text: '#424242', border: '#bdbdbd', dot: '#424242' },
];

function getStatusStyle(status) {
  let hash = 0;
  const s = status || '';
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % STATUS_COLORS.length;
  return STATUS_COLORS[idx];
}

export default function OrderSheetCard({ hearing, onView, selected }) {
  const { formatDate } = useFormat();
  const h = hearing;
  if (!h) return null;

  const style = getStatusStyle(h.status);

  return (
    <div className={`cl-card ${selected ? 'cl-card--selected' : ''}`}>
      <div className="cl-card__body">
        <div className="cl-card__top">
          <div className="cl-card__num">
            <span className="text-bold text-brand">{h.caseNumber}</span>
          </div>
          <span className="cl-card__badge" style={{ background: style.bg, color: style.text, borderColor: style.border }}>
            <span className="cl-card__badge-dot" style={{ background: style.dot }} />
            {h.status}
          </span>
        </div>
        <div className="cl-card__parties">{h.parties}</div>
        <div className="cl-card__court-row">
          <Icon name="building" size={13} /> {h.court}
        </div>
        <div className="cl-card__meta-row">
          <span><Icon name="users" size={13} /> {h.case?.bench_type || h.bench_type || '—'}</span>
          <span><Icon name="user" size={13} /> {h.case?.judge || h.judge || '—'}</span>
        </div>
        <div className="cl-card__dates">
          <div className="cl-card__dates-item cl-card__dates-item--next">
            <span className="cl-card__dates-label">Next Hearing</span>
            <span className="cl-card__dates-value"><Icon name="calendar" size={12} /> {formatDate(h.nextHearingDate || h.next_hearing_date) || '—'}</span>
          </div>
          <div className="cl-card__dates-divider" />
          <div className="cl-card__dates-item cl-card__dates-item--last">
            <span className="cl-card__dates-label">Last Hearing</span>
            <span className="cl-card__dates-value"><Icon name="calendar" size={12} /> {formatDate(h.date) || '—'}</span>
          </div>
        </div>
        {onView && (
          <div className="cl-card__actions">
            <button className="cl-card__action-btn" onClick={() => onView(h)} title="View">
              <Icon name="eye" size={14} /><span>View</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

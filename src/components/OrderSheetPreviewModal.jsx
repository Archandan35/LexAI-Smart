import { useState, useEffect, useMemo } from 'react';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';
import { useFormat } from '@/utils/format.js';
import { extractJurisdiction, combinedCourt } from '@/utils/caseFormat.js';
import { orderSheetLogic } from '@/logic/orderSheetLogic.js';
import { caseService } from '@/services/caseService.js';
import { caseHistoryService } from '@/services/caseHistoryService.js';
import { DateEngine } from '@/core/DateEngine.js';

function fmtCaseNumber(c) {
  if (!c) return '—';
  const ct = c.case_type || '';
  const cn = c.case_number || c.caseNumber || c.case_display_number;
  const cy = c.case_year || '';
  if (ct && cn && cy) return `${ct} ${cn}/${cy}`;
  return c.case_display_number || c.caseNumber || String(cn || '') || '—';
}

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

const statusColour = (s) => {
  const map = { completed: 'green', scheduled: 'blue', active: 'green', cancelled: 'red', adjourned: 'orange', disposed: 'grey' };
  return map[s?.toLowerCase()] || 'grey';
};

export default function OrderSheetPreviewModal({ hearing, doc, onClose, onViewDocument, cases: allCases }) {
  const { formatDate, formatDateTime } = useFormat();
  const [tab, setTab] = useState('current');
  const [historical, setHistorical] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortDir, setSortDir] = useState('desc');
  const [viewHearing, setViewHearing] = useState(hearing);

  const data = viewHearing || doc;
  if (!data) return null;

  const isDoc = !!doc;

  const caseId = !isDoc ? (
    data.caseId || data.case_id
    || data.case?.id
    || data.case?.caseId || data.case?._id
    || (allCases && allCases.find((h) =>
      h.id === data.id || h._id === data._id
    )?.case?.id)
  ) : null;

  const linkedCase = !isDoc && allCases
    ? allCases.find((h) => h.case?.id === caseId)?.case || null
    : null;

  useEffect(() => {
    if (tab === 'historical' && caseId && !isDoc) {
      setLoading(true);
      const fetchHistorical = async () => {
        const finalCaseId = caseId;
        try {
          let [caseRes, hearingsRes, historyRows] = await Promise.all([
            caseService.getCase(finalCaseId).catch(() => null),
            caseService.listHearings(finalCaseId).catch(() => null),
            caseHistoryService.list(finalCaseId).catch(() => null),
          ]);

          if ((!hearingsRes || hearingsRes.length === 0) && finalCaseId) {
            const all = await caseService.listHearings().catch(() => []);
            hearingsRes = all.filter((h) => (h.caseId || h.case_id) === finalCaseId);
          }
          if ((!historyRows || historyRows.length === 0) && finalCaseId) {
            const all = await caseHistoryService.list().catch(() => []);
            historyRows = all.filter((h) => (h.caseId || h.case_id) === finalCaseId);
          }

          const theCase = caseRes?.data || caseRes;

          const seen = new Set();
          const merged = [];

          const addItem = (item) => {
            const key = item.id || item._id;
            if (seen.has(key)) return;
            seen.add(key);
            merged.push(item);
          };

          const hearingsArr = Array.isArray(hearingsRes) ? hearingsRes : [];
          const historyArr = Array.isArray(historyRows) ? historyRows : [];

          hearingsArr.forEach((h) => {
            addItem({
              ...h,
              caseId: h.caseId || h.case_id || finalCaseId,
              case: theCase,
              caseNumber: theCase ? fmtCaseNumber(theCase) : '—',
              parties: theCase?.title || '—',
              court: theCase ? combinedCourt(theCase) : '—',
              stage: theCase?.stage || '—',
            });
          });

          historyArr.forEach((h) => {
            addItem({
              ...h,
              notes: h.text || h.notes,
              caseId: h.caseId || finalCaseId,
              case: theCase,
              caseNumber: theCase ? fmtCaseNumber(theCase) : '—',
              parties: theCase?.title || '—',
              court: theCase ? combinedCourt(theCase) : '—',
              stage: theCase?.stage || '—',
            });
          });

          setHistorical(merged);
        } catch {
          setHistorical([]);
        }
        setLoading(false);
      };
      fetchHistorical();
    }
  }, [tab, caseId, isDoc, data?.id, data?._id]);

  const sortedHistorical = useMemo(() => {
    const sorted = [...historical].sort((a, b) => {
      const cmp = DateEngine.compare(a.date, b.date);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [historical, sortDir]);

  const courtName = linkedCase
    ? [linkedCase.court, extractJurisdiction(linkedCase)].filter(Boolean).join(', ')
    : null;

  const displayTitle = isDoc ? doc.name || 'Document' : data.caseNumber || data.case?.caseNumber || 'Order Sheet Entry';
  const displaySubtitle = !isDoc && data.parties ? data.parties : null;

  const handleHistoricalView = (h) => {
    setViewHearing(h);
    setTab('current');
  };

  return (
    <Modal open={true} title="" onClose={onClose} size="lg" className="order-sheet-preview-modal" disableBackdrop disableEscape>
      <div className="hpm">
        <div className="hpm-drag-handle"><span></span></div>

        <div className="hpm-header">
          <div className="hpm-header__left">
            <div className="hpm-icon-circle hpm-icon-circle--xl">
              <Icon name="scales" size={24} strokeWidth={1.7} />
            </div>
            <div className="hpm-header__info">
              <h2 className="hpm-header__title">{displayTitle}</h2>
              {displaySubtitle && <p className="hpm-header__subtitle">{displaySubtitle}</p>}
            </div>
          </div>
          <div className="hpm-header__right">
            {!isDoc && data.date && (
              <span className="hpm-pill hpm-pill--date">
                <Icon name="calendar" size={12} strokeWidth={2} /> {formatDate(data.date)}
              </span>
            )}
            {data.status && (
              <span className={`hpm-pill hpm-pill--${statusColour(data.status)}`}>{data.status}</span>
            )}
            <button className="hpm-close-btn" onClick={onClose} aria-label="Close">
              <Icon name="close" size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {!isDoc && (data.date || data.status) && (
          <div className="hpm-mobile-badges">
            {data.date && (
              <span className="hpm-pill hpm-pill--date">
                <Icon name="calendar" size={13} strokeWidth={2.2} /> {formatDate(data.date)}
              </span>
            )}
            {data.status && (
              <span className={`hpm-pill hpm-pill--${statusColour(data.status)}`}>{data.status}</span>
            )}
          </div>
        )}

        {!isDoc && (
          <div className="hpm-tabs">
            <button
              className={`hpm-tab ${tab === 'current' ? 'hpm-tab--active' : ''}`}
              onClick={() => { setTab('current'); setViewHearing(hearing); }}
            >
              Current
            </button>
            <button
              className={`hpm-tab ${tab === 'historical' ? 'hpm-tab--active' : ''}`}
              onClick={() => setTab('historical')}
            >
              Historical
            </button>
          </div>
        )}

        {tab === 'current' ? (
          isDoc ? (
            <div className="hpm-body">
              <div className="hpm-card hpm-card--doc">
                <div className="hpm-doc-info">
                  <div className="hpm-icon-circle hpm-icon-circle--doc">
                    <Icon name="file" size={28} />
                  </div>
                  <div className="hpm-doc-details">
                    <h3>{doc.name}</h3>
                    {doc.size && <p className="hpm-meta-text">Size: {doc.size}</p>}
                    {doc.type && <p className="hpm-meta-text">Type: {doc.type}</p>}
                    {doc.ref && <p className="hpm-meta-text">Ref: {doc.ref}</p>}
                  </div>
                </div>
                {doc.ref && onViewDocument && (
                  <button className="btn btn--primary btn--sm" onClick={() => onViewDocument(doc.ref)}>
                    <Icon name="eye" size={14} /> Open Document
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="hpm-body">
              <div className="hpm-card hpm-card--section">
                <div className="hpm-section-title">
                  <div className="hpm-icon-circle hpm-icon-circle--md">
                    <Icon name="info" size={16} strokeWidth={2} />
                  </div>
                  <span>Case Information</span>
                  <Icon className="hpm-chevron" name="chevronDown" size={16} strokeWidth={2.5} />
                </div>
                <div className="hpm-grid hpm-grid--2x2">
                  <div className="hpm-cell">
                    <div className="hpm-cell__icon"><Icon name="doc" size={16} strokeWidth={2} /></div>
                    <div className="hpm-cell__body">
                      <span className="hpm-cell__label">Case Number</span>
                      <span className="hpm-cell__value">{data.caseNumber || data.case?.caseNumber || '—'}</span>
                    </div>
                  </div>
                  <div className="hpm-cell">
                    <div className="hpm-cell__icon"><Icon name="users" size={16} strokeWidth={2} /></div>
                    <div className="hpm-cell__body">
                      <span className="hpm-cell__label">Parties</span>
                      <span className="hpm-cell__value">{data.parties || data.case?.title || '—'}</span>
                    </div>
                  </div>
                  <div className="hpm-cell">
                    <div className="hpm-cell__icon"><Icon name="building" size={16} strokeWidth={2} /></div>
                    <div className="hpm-cell__body">
                      <span className="hpm-cell__label">Court</span>
                      <span className="hpm-cell__value">{courtName || data.court || '—'}</span>
                    </div>
                  </div>
                  <div className="hpm-cell">
                    <div className="hpm-cell__icon"><Icon name="user" size={16} strokeWidth={2} /></div>
                    <div className="hpm-cell__body">
                      <span className="hpm-cell__label">Judge</span>
                      <span className="hpm-cell__value">{data.judge || data.case?.judge || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hpm-card hpm-card--section">
                <div className="hpm-section-title">
                  <div className="hpm-icon-circle hpm-icon-circle--md">
                    <Icon name="calendar" size={16} strokeWidth={2} />
                  </div>
                  <span>Hearing Details</span>
                  <Icon className="hpm-chevron" name="chevronDown" size={16} strokeWidth={2.5} />
                </div>
                <div className="hpm-grid hpm-grid--4col">
                  <div className="hpm-hcell">
                    <div className="hpm-hcell__icon"><Icon name="calendar" size={15} strokeWidth={2} /></div>
                    <div className="hpm-hcell__body">
                      <span className="hpm-hcell__label">Date</span>
                      <span className="hpm-hcell__value">{formatDate(data.date) || '—'}</span>
                    </div>
                  </div>
                  <div className="hpm-hcell">
                    <div className="hpm-hcell__icon"><Icon name="calendar" size={15} strokeWidth={2} /></div>
                    <div className="hpm-hcell__body">
                      <span className="hpm-hcell__label">Next Hearing Date</span>
                      <span className="hpm-hcell__value">{formatDate(data.nextHearingDate || data.next_hearing_date) || '—'}</span>
                    </div>
                  </div>
                  <div className="hpm-hcell">
                    <div className="hpm-hcell__icon"><Icon name="doc" size={15} strokeWidth={2} /></div>
                    <div className="hpm-hcell__body">
                      <span className="hpm-hcell__label">Purpose</span>
                      <span className="hpm-hcell__value">{data.purpose || '—'}</span>
                    </div>
                  </div>
                  <div className="hpm-hcell">
                    <div className="hpm-hcell__icon"><Icon name="flag" size={15} strokeWidth={2} /></div>
                    <div className="hpm-hcell__body">
                      <span className="hpm-hcell__label">Posted For</span>
                      <span className="hpm-hcell__value">{data.postedFor || data.posted_for || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="hpm-grid hpm-grid--2col">
                  <div className="hpm-hcell">
                    <div className="hpm-hcell__icon"><Icon name="shield" size={15} strokeWidth={2} /></div>
                    <div className="hpm-hcell__body">
                      <span className="hpm-hcell__label">Status</span>
                      <span className="hpm-hcell__value">
                        <span className={`hpm-pill hpm-pill--${statusColour(data.status)}`}>{data.status}</span>
                      </span>
                    </div>
                  </div>
                  <div className="hpm-hcell">
                    <div className="hpm-hcell__icon"><Icon name="user" size={15} strokeWidth={2} /></div>
                    <div className="hpm-hcell__body">
                      <span className="hpm-hcell__label">Judge</span>
                      <span className="hpm-hcell__value">{data.judge || data.case?.judge || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {data.notes && (
                <div className="hpm-card hpm-card--section">
                  <div className="hpm-section-title">
                    <div className="hpm-icon-circle hpm-icon-circle--md">
                      <Icon name="doc" size={16} strokeWidth={2} />
                    </div>
                    <span>Proceedings</span>
                    <Icon className="hpm-chevron" name="chevronDown" size={16} strokeWidth={2.5} />
                  </div>
                  <div className="hpm-proceedings">
                    <div className="hpm-proceedings__text" dangerouslySetInnerHTML={{ __html: data.notes }} />
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="hpm-body">
            {loading ? (
              <div className="hpm-loading"><span className="spinner" /></div>
            ) : historical.length === 0 ? (
              <div className="hpm-empty">
                <Icon name="calendar" size={40} />
                <p>No other order sheets found for this case.</p>
              </div>
            ) : (
              <div>
                <div className="hpm-historical-toolbar">
                  <span className="hpm-historical-count">{historical.length} hearing{historical.length !== 1 ? 's' : ''}</span>
                  <button className="hpm-historical-sort" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                    <Icon name="arrowUp" size={12} strokeWidth={2.5} style={{ transform: sortDir === 'asc' ? 'none' : 'rotate(180deg)' }} />
                    {sortDir === 'asc' ? 'Low to High' : 'High to Low'}
                  </button>
                </div>
                <div className="hpm-historical-list">
                {sortedHistorical.map((h) => {
                  const st = getStatusStyle(h.status);
                  const updatedAt = h.updatedAt || h.updated_at || h.createdAt || h.created_at;
                  return (
                    <div
                      key={h.id}
                      className="hpm-historical-card"
                      onClick={() => handleHistoricalView(h)}
                    >
                      <div className="hpm-historical-card__accent" style={{ background: st.dot }} />
                      <div className="hpm-historical-card__body">
                        <div className="hpm-historical-card__header">
                          <span className="hpm-historical-card__date">
                            <Icon name="calendar" size={14} strokeWidth={2} /> {formatDate(h.date)}
                          </span>
                          <span className="hpm-historical-card__status">
                            <span className="hpm-historical-card__status-dot" style={{ background: st.dot }} />
                            {h.status}
                          </span>
                        </div>
                        {h.notes ? (
                          <div className="hpm-historical-card__notes" dangerouslySetInnerHTML={{ __html: h.notes }} />
                        ) : (
                          <div className="hpm-historical-card__notes hpm-historical-card__notes--empty">
                            <span className="muted">No proceedings recorded</span>
                          </div>
                        )}
                        <div className="hpm-historical-card__footer">
                          Last Updated : {formatDateTime(updatedAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            )}
          </div>
        )}

        <div className="hpm-action-bar">
          <button className="hpm-action-btn">
            <Icon name="share" size={20} strokeWidth={1.8} /> Share Case
          </button>
          <button className="hpm-action-btn">
            <Icon name="download" size={20} strokeWidth={1.8} /> Download
          </button>
        </div>
      </div>
    </Modal>
  );
}

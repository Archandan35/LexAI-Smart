import { useState, useEffect, useMemo, useRef } from 'react';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';
import DocEditor from './DocEditor.jsx';
import { useFormat } from '@/utils/format.js';
import { extractJurisdiction, combinedCourt } from '@/utils/caseFormat.js';
import { orderSheetLogic } from '@/logic/orderSheetLogic.js';
import { caseService } from '@/services/caseService.js';
import { caseHistoryService } from '@/services/caseHistoryService.js';
import { DateEngine } from '@/core/DateEngine.js';
import { safeHtml } from '@/utils/sanitize.js';

function fmtCaseNumber(c) {
  if (!c) return '—';
  const ct = c.case_type || '';
  const cn = c.case_number || c.caseNumber || c.case_display_number;
  const cy = c.case_year || '';
  if (ct && cn && cy) return `${ct} ${cn}/${cy}`;
  return c.case_display_number || c.caseNumber || String(cn || '') || '—';
}

const statusColour = (s) => {
  const v = (s || '').toLowerCase();
  if (/completed|done|finished|closed|allowed|granted/.test(v)) return 'green';
  if (/scheduled|reserved|upcoming|pending|part.heard/.test(v)) return 'blue';
  if (/active|progress|running|open/.test(v)) return 'green';
  if (/cancelled|dismissed|rejected|vacated|struck/.test(v)) return 'red';
  if (/adjourned|postponed|deferred|awaiting|continuance/.test(v)) return 'orange';
  if (/disposed|settled|withdrawn|decided|judgment/.test(v)) return 'grey';
  return 'grey';
};

const splitParties = (s) => {
  if (!s) return null;
  const m = String(s).split(/\s+(?:vs?\.?|versus)\s+/i);
  if (m.length < 2) return null;
  return { plaintiff: m[0].trim(), defendant: m.slice(1).join(' vs ').trim() };
};

export default function OrderSheetPreviewModal({ hearing, doc, onClose, onViewDocument, cases: allCases }) {
  const { formatDate, formatDateTime } = useFormat();
  const [tab, setTab] = useState('current');
  const [historical, setHistorical] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortDir, setSortDir] = useState('desc');
  const [editNotes, setEditNotes] = useState(false);
  const [editDraft, setEditDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [viewHearing, setViewHearing] = useState(hearing);
  const [collapsed, setCollapsed] = useState({});
  const [expandedNotes, setExpandedNotes] = useState({});
  const [overflowingNotes, setOverflowingNotes] = useState({});
  const notesRefs = useRef({});

  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

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

  useEffect(() => {
    setOverflowingNotes((prev) => {
      const next = { ...prev };
      Object.entries(notesRefs.current).forEach(([id, el]) => {
        if (el && !expandedNotes[id]) {
          next[id] = el.scrollHeight - el.clientHeight > 2;
        }
      });
      return next;
    });
  }, [sortedHistorical, tab, expandedNotes]);

  const courtName = linkedCase
    ? [linkedCase.court, extractJurisdiction(linkedCase)].filter(Boolean).join(', ')
    : null;

  const displayTitle = isDoc ? doc.name || 'Document' : data.caseNumber || data.case?.caseNumber || 'Order Sheet Entry';
  const displaySubtitle = !isDoc && data.parties ? data.parties : null;

  const handleHistoricalView = (h) => {
    setViewHearing(h);
    setEditNotes(false);
    setTab('current');
  };

  const handleEditNotes = () => {
    setEditDraft(data.notes || '');
    setEditNotes(true);
  };

  const handleSaveNotes = async () => {
    if (!data.id) return;
    setSavingNotes(true);
    try {
      const r = await orderSheetLogic.updateHearing(data.id, { notes: editDraft });
      if (r?.ok === false) throw new Error(r.error || 'Save failed');
      setViewHearing((prev) => ({ ...prev, notes: editDraft }));
      setEditNotes(false);
    } catch (e) {
      console.error('Failed to save proceedings:', e);
    }
    setSavingNotes(false);
  };

  const handleCancelNotes = () => {
    setEditNotes(false);
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
              <span className={`hpm-pill hpm-pill--${statusColour(data.status)}`}>
                {statusColour(data.status) === 'green' && <Icon name="check-circle" size={13} strokeWidth={2.2} />}
                {data.status}
              </span>
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
              <span className={`hpm-pill hpm-pill--${statusColour(data.status)}`}>
                {statusColour(data.status) === 'green' && <Icon name="check-circle" size={13} strokeWidth={2.2} />}
                {data.status}
              </span>
            )}
          </div>
        )}

        {!isDoc && (
          <div className="hpm-tabs">
            <button
              className={`hpm-tab ${tab === 'current' ? 'hpm-tab--active' : ''}`}
              onClick={() => { setTab('current'); setViewHearing(hearing); }}
            >
              <Icon name="clock" size={14} strokeWidth={2} /> Current
            </button>
            <button
              className={`hpm-tab ${tab === 'historical' ? 'hpm-tab--active' : ''}`}
              onClick={() => setTab('historical')}
            >
              <Icon name="clock" size={14} strokeWidth={2} /> Historical
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
              <div className={`hpm-card hpm-card--section${collapsed.info ? ' hpm-card--collapsed' : ''}`}>
                <button type="button" className="hpm-section-title" onClick={() => toggleSection('info')}>
                  <div className="hpm-icon-circle hpm-icon-circle--md">
                    <Icon name="info" size={16} strokeWidth={2} />
                  </div>
                  <span>Case Information</span>
                  <Icon className="hpm-chevron" name="chevron" size={16} strokeWidth={2.5} />
                </button>
                <div className="hpm-section-body">
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
                      {(() => {
                        const raw = data.parties || data.case?.title || '—';
                        const parts = splitParties(raw);
                        if (!parts) return <span className="hpm-cell__value">{raw}</span>;
                        return (
                          <span className="hpm-cell__value hpm-parties">
                            <span className="hpm-parties__name">{parts.plaintiff}</span>
                            <span className="hpm-parties__vs">vs</span>
                            <span className="hpm-parties__name">{parts.defendant}</span>
                          </span>
                        );
                      })()}
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
              </div>

              <div className={`hpm-card hpm-card--section${collapsed.hearing ? ' hpm-card--collapsed' : ''}`}>
                <button type="button" className="hpm-section-title" onClick={() => toggleSection('hearing')}>
                  <div className="hpm-icon-circle hpm-icon-circle--md">
                    <Icon name="calendar" size={16} strokeWidth={2} />
                  </div>
                  <span>Hearing Details</span>
                  <Icon className="hpm-chevron" name="chevron" size={16} strokeWidth={2.5} />
                </button>
                <div className="hpm-section-body">
                  <div className="hpm-hero-row">
                    <div className="hpm-hero hpm-hero--last">
                      <div className="hpm-hero__icon"><Icon name="calendar" size={16} strokeWidth={2} /></div>
                      <div className="hpm-hero__body">
                        <span className="hpm-hero__label">Last Hearing Date</span>
                        <span className="hpm-hero__value">{formatDate(data.date) || '—'}</span>
                      </div>
                    </div>
                    <div className="hpm-hero__divider" />
                    <div className="hpm-hero hpm-hero--next">
                      <div className="hpm-hero__icon"><Icon name="calendar" size={16} strokeWidth={2} /></div>
                      <div className="hpm-hero__body">
                        <span className="hpm-hero__label">Next Hearing Date</span>
                        <span className="hpm-hero__value">{formatDate(data.nextHearingDate || data.next_hearing_date) || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="hpm-detail-panel">
                    <div className="hpm-grid hpm-grid--2x2">
                      <div className="hpm-hcell">
                        <div className="hpm-hcell__icon"><Icon name="flag" size={15} strokeWidth={2} /></div>
                        <div className="hpm-hcell__body">
                          <span className="hpm-hcell__label">Purpose</span>
                          <span className="hpm-hcell__value">{data.purpose || '—'}</span>
                        </div>
                      </div>
                      <div className="hpm-hcell">
                        <div className="hpm-hcell__icon"><Icon name="gavel" size={15} strokeWidth={2} /></div>
                        <div className="hpm-hcell__body">
                          <span className="hpm-hcell__label">Posted For</span>
                          <span className="hpm-hcell__value">{data.postedFor || data.posted_for || '—'}</span>
                        </div>
                      </div>
                      <div className="hpm-hcell">
                        <div className="hpm-hcell__icon"><Icon name="shield" size={15} strokeWidth={2} /></div>
                        <div className="hpm-hcell__body">
                          <span className="hpm-hcell__label">Status</span>
                          <span className="hpm-hcell__value">
                            <span className={`hpm-pill hpm-pill--${statusColour(data.status)}`}>
                              {statusColour(data.status) === 'green' && <Icon name="check-circle" size={12} strokeWidth={2.2} />}
                              {data.status}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="hpm-hcell">
                        <div className="hpm-hcell__icon"><Icon name="users" size={15} strokeWidth={2} /></div>
                        <div className="hpm-hcell__body">
                          <span className="hpm-hcell__label">Bench</span>
                          <span className="hpm-hcell__value">{data.bench || data.case?.bench_type || data.case?.benchType || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`hpm-card hpm-card--section${collapsed.proceedings ? ' hpm-card--collapsed' : ''}`}>
                <div className="hpm-section-title">
                  <div className="hpm-icon-circle hpm-icon-circle--md">
                    <Icon name="doc" size={16} strokeWidth={2} />
                  </div>
                  <span>Proceedings</span>
                  <div className="hpm-section-title__actions">
                    {!editNotes ? (
                      <button className="linkbtn" onClick={handleEditNotes}>
                        <Icon name="edit" size={13} /> Edit
                      </button>
                    ) : (
                      <>
                        <button className="linkbtn" onClick={handleCancelNotes} disabled={savingNotes}>Cancel</button>
                        <button className="linkbtn linkbtn--save" onClick={handleSaveNotes} disabled={savingNotes}>
                          {savingNotes ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    )}
                  </div>
                  <button type="button" className="hpm-chevron-btn" onClick={() => toggleSection('proceedings')} aria-label="Toggle section">
                    <Icon className="hpm-chevron" name="chevron" size={16} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="hpm-section-body">
                {editNotes ? (
                  <div className="hpm-proceedings hpm-proceedings--edit">
                    <DocEditor value={editDraft} onChange={setEditDraft} />
                  </div>
                ) : data.notes ? (
                  <div className="hpm-proceedings">
                    <div className="hpm-proceedings__text" dangerouslySetInnerHTML={safeHtml(data.notes)} />
                  </div>
                ) : (
                  <div className="hpm-proceedings hpm-proceedings--empty">
                    <span className="muted">No proceedings recorded.</span>
                  </div>
                )}
                </div>
              </div>
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
              <div className="hpm-historical-panel">
                <div className="hpm-historical-toolbar">
                  <span className="hpm-historical-count">{historical.length} hearing{historical.length !== 1 ? 's' : ''}</span>
                  <select className="hpm-historical-sort" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                    <option value="desc">Recent</option>
                    <option value="asc">Oldest</option>
                  </select>
                </div>
                <div className="hpm-historical-list">
                {sortedHistorical.map((h) => {
                  const tone = statusColour(h.status);
                  const updatedAt = h.updatedAt || h.updated_at || h.createdAt || h.created_at || h.date;
                  return (
                    <div
                      key={h.id}
                      className={`hpm-historical-card hpm-tone--${tone || 'grey'}`}
                      onClick={() => handleHistoricalView(h)}
                    >
                      <div className={`hpm-historical-card__accent hpm-pill--${tone || 'grey'}`} />
                      <div className="hpm-timeline-rail">
                        <div className="hpm-timeline-rail__dot">
                          <Icon name="calendar" size={18} strokeWidth={1.9} />
                        </div>
                        <div className="hpm-timeline-rail__line" />
                      </div>
                      <div className="hpm-historical-card__body">
                        <div className="hpm-historical-card__header">
                          <span className="hpm-historical-card__date">
                            <Icon name="calendar" size={14} strokeWidth={2} /> {formatDate(h.date)}
                          </span>
                          <span className={`hpm-pill hpm-pill--${tone}`}>
                            <span className="dot" />
                            {h.status}
                          </span>
                        </div>
                        {h.notes ? (
                          <div className="hpm-historical-card__notes-wrap">
                            <div
                              ref={(el) => { notesRefs.current[h.id] = el; }}
                              className={`hpm-historical-card__notes${expandedNotes[h.id] ? ' is-expanded' : ''}`}
                              dangerouslySetInnerHTML={safeHtml(h.notes)}
                            />
                            {(overflowingNotes[h.id] || expandedNotes[h.id]) && (
                              <button
                                type="button"
                                className="hpm-readmore"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedNotes((prev) => ({ ...prev, [h.id]: !prev[h.id] }));
                                }}
                              >
                                {expandedNotes[h.id] ? 'Read less' : 'Read more ...'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="hpm-historical-card__notes hpm-historical-card__notes--empty">
                            <span className="muted">No proceedings recorded</span>
                          </div>
                        )}
                        <div className="hpm-historical-card__footer">
                          <span className="hpm-historical-card__updated">
                            <Icon className="hpm-hc-clock" name="clock" size={13} strokeWidth={1.8} /> Last Updated : {formatDateTime(updatedAt)}
                          </span>
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

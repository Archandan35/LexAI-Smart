import React from 'react';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';
import { formatDate } from '@/utils/format.js';
import { extractJurisdiction } from '@/utils/caseFormat.js';

const statusColour = (s) => {
  const map = { completed: 'green', scheduled: 'blue', active: 'green', cancelled: 'red', adjourned: 'orange', disposed: 'grey' };
  return map[s?.toLowerCase()] || 'grey';
};

export default function HearingPreviewModal({ hearing, doc, onClose, onViewDocument, cases: allCases }) {
  const data = hearing || doc;
  if (!data) return null;

  const isDoc = !!doc;

  const linkedCase = !isDoc && data.caseId && allCases
    ? allCases.find((c) => c.id === data.caseId)
    : null;

  const courtName = linkedCase
    ? [linkedCase.court, extractJurisdiction(linkedCase)].filter(Boolean).join(', ')
    : null;

  const displayTitle = isDoc ? doc.name || 'Document' : data.caseNumber || data.case?.caseNumber || 'Cause List Entry';
  const displaySubtitle = !isDoc && data.parties ? data.parties : null;

  return (
    <Modal open={true} title="" onClose={onClose} size="lg" className="hearing-preview-modal" disableBackdrop disableEscape>
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

        {isDoc ? (
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

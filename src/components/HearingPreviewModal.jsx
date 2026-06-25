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

  return (
    <Modal open={true} title="" onClose={onClose} size="lg" className="hearing-preview-modal" disableBackdrop disableEscape>
      <div className="hpm-header">
        <div className="hpm-header__left">
          <h1 className="hpm-header__title">
            {isDoc ? doc.name || 'Document' : data.caseNumber || data.case?.caseNumber || 'Cause List Entry'}
          </h1>
          {!isDoc && data.parties && <p className="hpm-header__subtitle">{data.parties}</p>}
        </div>
        <div className="hpm-header__right">
          <div className="hpm-header__badges">
            {!isDoc && data.date && <span className="hpm-badge hpm-badge--date"><Icon name="calendar" size={13} /> {formatDate(data.date)}</span>}
            {data.status && <span className={`hpm-badge hpm-badge--${statusColour(data.status)}`}>{data.status}</span>}
          </div>
          <div className="hpm-header__actions">
            <button className="hpm-header__btn" title="Close" onClick={onClose}><Icon name="close" size={18} /></button>
          </div>
        </div>
      </div>

      <div className="hpm-body">
        {isDoc ? (
          <div className="hpm-section">
            <div className="hpm-card">
              <div className="hpm-doc-info">
                <div className="hpm-doc-icon"><Icon name="file" size={32} /></div>
                <div className="hpm-doc-details">
                  <h3>{doc.name}</h3>
                  {doc.size && <p className="hpm-meta-text">Size: {doc.size}</p>}
                  {doc.type && <p className="hpm-meta-text">Type: {doc.type}</p>}
                  {doc.ref && <p className="hpm-meta-text">Ref: {doc.ref}</p>}
                </div>
              </div>
              {doc.ref && onViewDocument && (
                <button className="btn btn--primary btn--sm" onClick={() => onViewDocument(doc.ref)} style={{ marginTop: 12 }}>
                  <Icon name="eye" size={14} /> Open Document
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="hpm-section">
              <div className="hpm-section__title"><Icon name="vault" size={15} /> Case Information</div>
              <div className="hpm-grid">
                <div className="hpm-field"><span className="hpm-label">Case Number</span><span className="hpm-value">{data.caseNumber || data.case?.caseNumber || '—'}</span></div>
                <div className="hpm-field"><span className="hpm-label">Parties</span><span className="hpm-value">{data.parties || data.case?.title || '—'}</span></div>
                <div className="hpm-field"><span className="hpm-label">Court</span><span className="hpm-value">{courtName || data.court || '—'}</span></div>
                <div className="hpm-field"><span className="hpm-label">Judge</span><span className="hpm-value">{data.judge || data.case?.judge || '—'}</span></div>
              </div>
            </div>

            <div className="hpm-section">
              <div className="hpm-section__title"><Icon name="calendar" size={15} /> Hearing Details</div>
              <div className="hpm-grid">
                <div className="hpm-field"><span className="hpm-label">Date</span><span className="hpm-value">{formatDate(data.date) || '—'}</span></div>
                <div className="hpm-field"><span className="hpm-label">Purpose</span><span className="hpm-value">{data.purpose || '—'}</span></div>
                <div className="hpm-field"><span className="hpm-label">Status</span><span className="hpm-value"><span className={`hpm-badge hpm-badge--${statusColour(data.status)}`}>{data.status}</span></span></div>
                <div className="hpm-field"><span className="hpm-label">Judge</span><span className="hpm-value">{data.judge || data.case?.judge || '—'}</span></div>
              </div>
            </div>

            {data.notes && (
              <div className="hpm-section">
                <div className="hpm-section__title"><Icon name="file" size={15} /> Proceedings</div>
                <div className="hpm-card hpm-card--rich">
                  <div className="hpm-richtext" dangerouslySetInnerHTML={{ __html: data.notes }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
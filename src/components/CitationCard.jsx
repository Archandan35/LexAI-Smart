import { useState } from 'react';
import Icon from './Icon.jsx';
import Badge from './Badge.jsx';
import { formatDate } from '@/utils/format.js';
import { citationLogic } from '@/logic/citationLogic.js';

// Renders one retrieved/verified judgment. Shows relevance, court, date,
// verified source link, and expandable relevant paragraphs. Used by Citation
// Search, Research, Hearing Notes — never fabricates content.
export default function CitationCard({ item, rank }) {
  const [open, setOpen] = useState(false);
  const paras = item.paragraphs || [];
  return (
    <div className="card card--hover citation-card">
      <div className="card__body">
        <div className="citation-card__flex">
          {typeof item.relevance === 'number' && (
            <div className="citation-card__relevance">
              {item.relevance}<span className="citation-card__pct">%</span>
            </div>
          )}
          <div className="citation-card__content">
            <div className="citation-card__meta-row">
              {rank && <span className="tag tag--key citation-card__rank">#{rank}</span>}
              <strong className="citation-card__citation">{item.citation}</strong>
              <Badge dot>{citationLogic.statusLabel(item.verification || 'verified')}</Badge>
            </div>
            <div className="citation-card__court">
              {item.court} · {formatDate(item.date)}
            </div>
            {(item.keywords || []).length > 0 && (
              <div className="citation-card__keywords">
                {item.keywords.slice(0, 6).map((k) => <span key={k} className="tag">{k}</span>)}
              </div>
            )}
            <div className="citation-card__actions">
              {item.sourceUrl && (
                <a className="btn btn--ghost btn--sm" href={item.sourceUrl} target="_blank" rel="noreferrer">
                  <Icon name="link" size={14} /> Verified source
                </a>
              )}
              {paras.length > 0 && (
                <button className="btn btn--ghost btn--sm" onClick={() => setOpen((o) => !o)}>
                  <Icon name="eye" size={14} /> {open ? 'Hide' : 'Relevant'} paragraphs ({paras.length})
                </button>
              )}
            </div>
            {open && paras.length > 0 && (
              <div className="citation-card__paras">
                {paras.map((p) => (
                  <div key={p.number} className="citation-card__para">
                    <strong className="citation-card__para-num">¶ {p.number}.</strong> {p.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


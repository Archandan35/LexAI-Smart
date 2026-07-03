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
    <div className="card card--hover" style={{ marginBottom: 14 }}>
      <div className="card__body">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {typeof item.relevance === 'number' && (
            <div style={{
              flexShrink: 0, width: 52, height: 52, borderRadius: 12,
              background: 'var(--brand-soft)', color: 'var(--navy-700)',
              display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 16,
            }}>
              {item.relevance}<span style={{ fontSize: 9, marginTop: -2 }}>%</span>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {rank && <span className="tag tag--key" style={{ margin: 0 }}>#{rank}</span>}
              <strong style={{ fontSize: 14.5, color: 'var(--navy-900)' }}>{item.citation}</strong>
              <Badge dot>{citationLogic.statusLabel(item.verification || 'verified')}</Badge>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginTop: 5 }}>
              {item.court} · {formatDate(item.date)}
            </div>
            {(item.keywords || []).length > 0 && (
              <div style={{ marginTop: 9 }}>
                {item.keywords.slice(0, 6).map((k) => <span key={k} className="tag">{k}</span>)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 14, marginTop: 11, alignItems: 'center' }}>
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
              <div style={{ marginTop: 12, borderTop: '1px dashed var(--border)', paddingTop: 12 }}>
                {paras.map((p) => (
                  <div key={p.number} style={{ marginBottom: 10, fontSize: 13, lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--navy-700)' }}>¶ {p.number}.</strong> {p.text}
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


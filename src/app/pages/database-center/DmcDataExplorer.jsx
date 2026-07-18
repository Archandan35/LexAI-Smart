import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { caseService } from '@/services/caseService.js';
import { bytes, useFormat } from '@/utils/format.js';
import { storageService } from '@/services/storageService.js';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';

const COLLECTIONS = databaseAdminService.knownCollections();
const STAT_VARIANTS = ['indigo', 'green', 'amber', 'blue'];
const VARIANT_MAP = { indigo: 0, green: 1, amber: 2, blue: 3, purple: 4, cyan: 5 };

export default function DmcDataExplorer() {
  const { formatDate } = useFormat();
  const navigate = useNavigate();
  const [collection, setCollection] = useState('documents');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [counts, setCounts] = useState({});
  const [showCollectionGrid, setShowCollectionGrid] = useState(false);

  useEffect(() => {
    databaseAdminService.counts().then(setCounts).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      if (collection === 'documents') setRows(await documentsRepository.getAll().catch(() => []));
      else if (collection === 'cases') setRows(await caseService.listCases().catch(() => []));
      else setRows([]);
    } catch { setRows([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [collection]);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.name || r.title || r.id || r.caseNumber || '').toLowerCase().includes(q);
  });

  const fields = collection === 'documents'
    ? ['name', 'folder', 'mime', 'size', 'uploadedAt']
    : collection === 'cases'
    ? ['caseNumber', 'case_type', 'case_year', 'status', 'createdAt']
    : ['id', 'name'];

  const renderCell = (r, f) => {
    if (f === 'size') return bytes(r[f] || 0);
    if (f === 'uploadedAt' || f === 'createdAt') return formatDate(r[f] || r.uploaded_at || r.created_at);
    if (f === 'name' && collection === 'documents') {
      return <a href="#" onClick={(e) => { e.preventDefault(); setPreviewDoc(r); }} className="dmc-explorer-link">{r[f] || r.title}</a>;
    }
    if (f === 'caseNumber') {
      return <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{r[f] || '\u2014'}</span>;
    }
    if (f === 'status') {
      const status = (r[f] || '').toLowerCase();
      const color = status === 'active' || status === 'open' ? 'green' : status === 'closed' || status === 'resolved' ? 'navy' : 'amber';
      return <span className={`dmc-badge dmc-badge--${color}`}>{r[f] || '\u2014'}</span>;
    }
    return r[f] || '\u2014';
  };

  const totalCount = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
  const icons = ['layers', 'folder', 'file-text', 'edit', 'folder-plus', 'calendar'];

  const statCards = [
    { label: 'Collections', value: COLLECTIONS.length, sub: 'Available schemas', variant: 'indigo', icon: 'layers' },
    { label: 'Total Records', value: totalCount, sub: 'Across all collections', variant: 'green', icon: 'database' },
    { label: 'Provider', value: databaseAdminService.providerName(), sub: 'Schema v' + databaseAdminService.schemaVersion(), variant: 'amber', icon: 'server' },
    { label: 'Loaded', value: rows.length, sub: 'In ' + collection, variant: 'blue', icon: 'filter' },
  ];

  return (
    <>
      <div className="dmc-db-hero">
        <div className="dmc-db-hero__icon"><Icon name="layers" size={36} /></div>
        <div className="dmc-db-hero__text">
          <div className="dmc-db-hero__accent" />
          <h2>Data Explorer</h2>
          <p>Browse, search, and inspect every collection in your database. View records, preview documents, and monitor data at a glance.</p>
          <div className="dmc-db-hero__actions">
            <Button variant="primary" size="sm" onClick={() => navigate('/admin/database-center/import')}>
              <Icon name="download" size={14} /> Import Data
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/database-center/export')}>
              <Icon name="upload" size={14} /> Export Data
            </Button>
          </div>
        </div>
        <div className="dmc-db-hero__watermark"><Icon name="layers" size={96} /></div>
      </div>

      <div className="dmc-db-stats-row">
        {statCards.map((c, i) => (
          <div key={c.label} className="dmc-db-statcard">
            <div className={`dmc-db-statcard__icon dmc-db-statcard__icon--${STAT_VARIANTS[i]}`}>
              <Icon name={c.icon} size={18} />
            </div>
            <div className="dmc-db-statcard__body">
              <div className="dmc-db-statcard__label">{c.label}</div>
              <div className="dmc-db-statcard__value">{c.value}</div>
              <div className="dmc-db-statcard__sub">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dmc-db-section">
        <div className="dmc-db-section__head">
          <div className="dmc-db-section__title"><Icon name="layers" size={18} /> Collection Browser</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="dmc-db-section__badge">{filtered.length} / {totalCount} records</span>
            <button
              onClick={() => setShowCollectionGrid(!showCollectionGrid)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: showCollectionGrid ? 'var(--brand)' : 'var(--text-soft)', padding: 4, display: 'flex' }}
              title="Toggle collection overview"
            ><Icon name="grid" size={16} /></button>
          </div>
        </div>

        {showCollectionGrid && (
          <div className="dmc-db-section__body" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="dmc-db-stats-row" style={{ marginBottom: 0 }}>
              {COLLECTIONS.map((c, i) => (
                <div
                  key={c}
                  className="dmc-db-statcard"
                  style={{ cursor: 'pointer', flex: '1 1 calc(16.66% - 12px)', minWidth: 130, border: collection === c ? '2px solid var(--brand)' : '1px solid var(--border)' }}
                  onClick={() => { setCollection(c); setShowCollectionGrid(false); }}
                >
                  <div className={`dmc-db-statcard__icon dmc-db-statcard__icon--${STAT_VARIANTS[i % 4]}`}>
                    <Icon name={icons[i % icons.length]} size={16} />
                  </div>
                  <div className="dmc-db-statcard__body">
                    <div className="dmc-db-statcard__label" style={{ fontSize: 8.5 }}>{c}</div>
                    <div className="dmc-db-statcard__value" style={{ fontSize: 16 }}>{counts[c] ?? '\u2014'}</div>
                    <div className="dmc-db-statcard__sub">records</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="dmc-db-section__body">
          <div className="dmc-db-toolbar">
            <div className="dmc-db-toolbar__left">
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {COLLECTIONS.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    onClick={() => { setCollection(c); setPreviewDoc(null); }}
                    style={{
                      padding: '5px 12px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)',
                      cursor: 'pointer', background: collection === c ? 'var(--brand)' : 'transparent',
                      color: collection === c ? '#fff' : 'var(--text-soft)',
                      fontWeight: collection === c ? 600 : 400,
                    }}
                  >{c}</button>
                ))}
                {COLLECTIONS.length > 6 && (
                  <select className="dmc-db-select" value={collection} onChange={(e) => { setCollection(e.target.value); setPreviewDoc(null); }}
                    style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6 }}
                  >
                    {COLLECTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div className="dmc-db-search" style={{ minWidth: 160 }}>
                <Icon name="search" size={14} />
                <input placeholder="Search\u2026" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="dmc-db-toolbar__right">
              <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
                <Icon name="refresh" size={14} /> {loading ? 'Loading\u2026' : 'Refresh'}
              </Button>
            </div>
          </div>

          {previewDoc && (
            <div style={{ marginBottom: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="file-text" size={16} style={{ color: 'var(--brand)' }} />
                  </div>
                  <strong>{previewDoc.name || previewDoc.title}</strong>
                </div>
                <button onClick={() => setPreviewDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-soft)' }}><Icon name="close" size={16} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-faint)' }}>ID</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{previewDoc.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-faint)' }}>Folder</span>
                  <span>{previewDoc.folder || '\u2014'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-faint)' }}>Size</span>
                  <span>{bytes(previewDoc.size || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-faint)' }}>Type</span>
                  <span>{previewDoc.mime || '\u2014'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-faint)' }}>Uploaded</span>
                  <span>{formatDate(previewDoc.uploaded_at || previewDoc.uploadedAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-faint)' }}>Sync</span>
                  <span>{previewDoc.syncStatus || '\u2014'}</span>
                </div>
              </div>
              {previewDoc.ref && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn--sm btn--ghost" onClick={() => storageService.getUrl(previewDoc.ref).then((url) => url && window.open(url, '_blank'))}>
                    <Icon name="eye" size={14} /> View File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="dmc-empty" style={{ padding: '32px 20px' }}><div className="dmc-empty__title">Loading records\u2026</div></div>
        ) : filtered.length === 0 ? (
          <div className="dmc-empty">
            <div className="dmc-empty__icon"><Icon name="layers" size={32} /></div>
            <div className="dmc-empty__title">No records found</div>
            <div className="dmc-empty__hint">Try a different collection or search term.</div>
          </div>
        ) : (
          <div className="dmc-db-table-wrap">
            <table className="dmc-db-table">
              <thead>
                <tr>{fields.map((f) => <th key={f}>{f}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((r) => (
                  <tr key={r.id}>
                    {fields.map((f) => <td key={f}>{renderCell(r, f)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { caseService } from '@/services/caseService.js';
import { bytes, useFormat } from '@/utils/format.js';
import { storageService } from '@/services/storageService.js';
import Icon from '@/components/Icon.jsx';

const COLLECTIONS = ['documents', 'cases', 'drafts', 'notes', 'case_folders', 'hearings'];

export default function DmcDataExplorer() {
  const { formatDate } = useFormat();
  const [collection, setCollection] = useState('documents');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

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
    return (r.name || r.title || r.id || '').toLowerCase().includes(q);
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
    return r[f] || r[f.replace(/^[a-z]/, (c) => c.toUpperCase())] || '\u2014';
  };

  return (
    <>
      <div className="dmc-db-hero dmc-db-hero--sm">
        <div className="dmc-db-hero__icon"><Icon name="layers" size={26} /></div>
        <div className="dmc-db-hero__text">
          <div className="dmc-db-hero__accent" />
          <h2>Data Explorer</h2>
          <p>Browse, search, and inspect database collections.</p>
        </div>
      </div>

      <div className="dmc-db-section">
        <div className="dmc-db-section__head">
          <div className="dmc-db-section__title"><Icon name="layers" size={18} /> Collection Browser</div>
          <span className="dmc-db-section__badge">{filtered.length} record(s)</span>
        </div>
        <div className="dmc-db-section__body">
          <div className="dmc-db-toolbar">
            <div className="dmc-db-toolbar__left">
              <select className="dmc-db-select" value={collection} onChange={(e) => { setCollection(e.target.value); setPreviewDoc(null); }}>
                {COLLECTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="dmc-db-search">
                <Icon name="search" size={14} />
                <input placeholder="Search records\u2026" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
          {previewDoc && (
            <div style={{ marginBottom: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <strong>{previewDoc.name || previewDoc.title}</strong>
                <button className="iconbtn" onClick={() => setPreviewDoc(null)}><Icon name="close" size={16} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                <div><span style={{ color: 'var(--text-faint)' }}>ID:</span> {previewDoc.id}</div>
                <div><span style={{ color: 'var(--text-faint)' }}>Folder:</span> {previewDoc.folder || '\u2014'}</div>
                <div><span style={{ color: 'var(--text-faint)' }}>Size:</span> {bytes(previewDoc.size || 0)}</div>
                <div><span style={{ color: 'var(--text-faint)' }}>Type:</span> {previewDoc.mime || '\u2014'}</div>
                <div><span style={{ color: 'var(--text-faint)' }}>Uploaded:</span> {formatDate(previewDoc.uploaded_at || previewDoc.uploadedAt)}</div>
                <div><span style={{ color: 'var(--text-faint)' }}>Sync:</span> {previewDoc.syncStatus || '\u2014'}</div>
              </div>
              {previewDoc.ref && (
                <div style={{ marginTop: 10 }}>
                  <button className="btn btn--sm btn--ghost" onClick={() => storageService.getUrl(previewDoc.ref).then((url) => url && window.open(url, '_blank'))}>
                    <Icon name="eye" size={14} /> View File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {loading ? (
          <div className="dmc-empty"><div className="dmc-empty__title">Loading\u2026</div></div>
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

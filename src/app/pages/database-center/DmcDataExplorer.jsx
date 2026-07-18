import { useState, useEffect } from 'react';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { caseService } from '@/services/caseService.js';
import { bytes, useFormat } from '@/utils/format.js';
import { storageService } from '@/services/storageService.js';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';

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
      if (collection === 'documents') {
        const all = await documentsRepository.getAll().catch(() => []);
        setRows(all);
      } else if (collection === 'cases') {
        setRows(await caseService.listCases().catch(() => []));
      } else {
        setRows([]);
      }
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
    return r[f] || r[f.replace(/^[a-z]/, (c) => c.toUpperCase())] || '—';
  };

  return (
    <>
      <div className="dmc-db-hero dmc-db-hero--sm">
        <div className="dmc-db-hero__icon">
          <Icon name="layers" size={26} />
        </div>
        <div className="dmc-db-hero__text">
          <div className="dmc-db-hero__accent" />
          <h2>Data Explorer</h2>
          <p>Browse, search, and inspect database collections.</p>
        </div>
      </div>

      <div className="dmc-db-section">
        <div className="dmc-db-section__head">
          <div className="dmc-db-section__title">
            <Icon name="layers" size={18} /> Collection Browser
          </div>
          <span className="dmc-db-section__badge">{filtered.length} record(s)</span>
        </div>
        <div className="dmc-db-section__body">
          <div className="dmc-db-toolbar" style={{ marginBottom: 16 }}>
            <div className="dmc-db-toolbar__left">
              <select className="dmc-db-select" value={collection} onChange={(e) => { setCollection(e.target.value); setPreviewDoc(null); }}>
                {COLLECTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="dmc-db-search">
                <Icon name="search" size={14} />
                <input placeholder="Search records…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </div>

          {previewDoc && (
            <div className="dmc-card dmc-preview-card">
              <div className="dmc-preview-header">
                <strong>{previewDoc.name || previewDoc.title}</strong>
                <button className="iconbtn" onClick={() => setPreviewDoc(null)}><Icon name="close" size={16} /></button>
              </div>
              <div className="dmc-preview-grid">
                <div><span className="dmc-label-faint">ID:</span> {previewDoc.id}</div>
                <div><span className="dmc-label-faint">Folder:</span> {previewDoc.folder || '—'}</div>
                <div><span className="dmc-label-faint">Size:</span> {bytes(previewDoc.size || 0)}</div>
                <div><span className="dmc-label-faint">Type:</span> {previewDoc.mime || '—'}</div>
                <div><span className="dmc-label-faint">Uploaded:</span> {formatDate(previewDoc.uploaded_at || previewDoc.uploadedAt)}</div>
                <div><span className="dmc-label-faint">Sync:</span> {previewDoc.syncStatus || '—'}</div>
              </div>
              {previewDoc.ref && (
                <div className="dmc-preview-actions">
                  <button className="btn btn--sm btn--ghost" onClick={() => storageService.getUrl(previewDoc.ref).then((url) => url && window.open(url, '_blank'))}>
                    <Icon name="eye" size={14} /> View File
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="dmc-db-table-wrap">
            <table className="dmc-db-table">
              <thead>
                <tr>{fields.map((f) => <th key={f}>{f}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={fields.length} className="dmc-empty-cell">{loading ? 'Loading…' : 'No records found.'}</td></tr>
                ) : (
                  filtered.slice(0, 50).map((r) => (
                    <tr key={r.id}>
                      {fields.map((f) => <td key={f}>{renderCell(r, f)}</td>)}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';
import { caseService } from '@/services/caseService.js';
import { formatDate, bytes } from '@/utils/format.js';
import { storageService } from '@/services/storageService.js';
import PageHeader from '@/components/PageHeader.jsx';
import Icon from '@/components/Icon.jsx';

const COLLECTIONS = ['documents', 'cases', 'drafts', 'notes', 'case_folders', 'hearings'];

export default function DmcDataExplorer() {
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
      return <a href="#" onClick={(e) => { e.preventDefault(); setPreviewDoc(r); }} style={{ color: 'var(--brand)', textDecoration: 'none' }}>{r[f] || r.title}</a>;
    }
    return r[f] || r[f.replace(/^[a-z]/, (c) => c.toUpperCase())] || '—';
  };

  return (
    <>
      <PageHeader icon="layers" title="Data Explorer" subtitle="Browse, search, and inspect database collections." />

      <div className="dmc-toolbar">
        <div className="dmc-toolbar__left">
          <select className="dmc-select" value={collection} onChange={(e) => { setCollection(e.target.value); setPreviewDoc(null); }}>
            {COLLECTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="dmc-search" placeholder="Search records…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="dmc-toolbar__right">
          <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>{filtered.length} record(s)</span>
        </div>
      </div>

      {previewDoc && (
        <div className="dmc-card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong>{previewDoc.name || previewDoc.title}</strong>
            <button className="iconbtn" onClick={() => setPreviewDoc(null)}><Icon name="close" size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
            <div><span style={{ color: 'var(--text-faint)' }}>ID:</span> {previewDoc.id}</div>
            <div><span style={{ color: 'var(--text-faint)' }}>Folder:</span> {previewDoc.folder || '—'}</div>
            <div><span style={{ color: 'var(--text-faint)' }}>Size:</span> {bytes(previewDoc.size || 0)}</div>
            <div><span style={{ color: 'var(--text-faint)' }}>Type:</span> {previewDoc.mime || '—'}</div>
            <div><span style={{ color: 'var(--text-faint)' }}>Uploaded:</span> {formatDate(previewDoc.uploaded_at || previewDoc.uploadedAt)}</div>
            <div><span style={{ color: 'var(--text-faint)' }}>Sync:</span> {previewDoc.syncStatus || '—'}</div>
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

      <table className="dmc-table">
        <thead>
          <tr>{fields.map((f) => <th key={f}>{f}</th>)}</tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={fields.length} style={{ textAlign: 'center', padding: 32, color: 'var(--text-faint)' }}>{loading ? 'Loading…' : 'No records found.'}</td></tr>
          ) : (
            filtered.slice(0, 50).map((r) => (
              <tr key={r.id}>
                {fields.map((f) => <td key={f}>{renderCell(r, f)}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
